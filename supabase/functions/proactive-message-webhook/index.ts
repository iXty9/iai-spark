
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const ProactiveMessageSchema = z.object({
  user_id: z.string().uuid().optional(),
  username: z.string().min(1).max(100).optional(),
  broadcast_all: z.boolean().optional().default(false),
  message: z.string().min(1).max(10000),
  sender: z.string().min(1).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type ProactiveMessageRequest = z.infer<typeof ProactiveMessageSchema>;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse and validate the incoming request
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validation = ProactiveMessageSchema.safeParse(rawBody);
    
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: ProactiveMessageRequest = validation.data;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine targeting mode
    const wantsBroadcast = body.broadcast_all === true;
    let targetUserId: string | null = null;

    if (!wantsBroadcast) {
      // Must target a specific user
      if (body.user_id) {
        targetUserId = body.user_id;
        console.log('Targeting by user_id:', targetUserId);
      } else if (body.username) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('username', body.username)
          .maybeSingle();
        
        if (!profile) {
          console.error('User not found for username:', body.username);
          return new Response(
            JSON.stringify({ 
              error: 'User not found',
              details: `No user found with username: ${body.username}`
            }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        targetUserId = profile.id;
        console.log('Targeting by username lookup:', body.username, '-> user_id:', targetUserId);
      } else {
        // No targeting specified and not broadcast - reject request
        console.error('Invalid request: no target specified and broadcast_all not set');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request',
            details: 'Must specify user_id, username, or set broadcast_all: true'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      console.log('Broadcasting to all users (broadcast_all: true)');
    }

    // Create the message object with correct field names for client
    const messageData = {
      id: crypto.randomUUID(),
      content: body.message,
      sender: body.sender || 'System',
      timestamp: new Date().toISOString(),
      metadata: {
        ...body.metadata,
        isProactive: true,
        source: 'webhook'
      }
    };

    console.log('Sending proactive message:', {
      messageData,
      targetUserId,
      deliveryMode: wantsBroadcast ? 'broadcast_all' : 'targeted',
      channelName: 'proactive-messages'
    });

    // Use consistent channel name with hyphen - NO presence config to match client
    const channel = supabaseClient.channel('proactive-messages', {
      config: {
        broadcast: { self: false }
      }
    });
    
    // Build payload - only include target_user if NOT broadcasting
    const payload = {
      data: messageData,
      target_user: wantsBroadcast ? undefined : targetUserId,
      is_broadcast: wantsBroadcast
    };

    console.log('Broadcasting with payload structure:', payload);

    // Subscribe briefly to establish channel, then send
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        console.log('Edge function channel status:', status);
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });

    const result = await channel.send({
      type: 'broadcast',
      event: 'proactive_message',
      payload: payload
    });

    console.log('Broadcast result:', result);

    // Clean up the channel
    await supabaseClient.removeChannel(channel);

    console.log('Proactive message sent successfully', {
      delivery_mode: wantsBroadcast ? 'broadcast_all' : 'targeted',
      target_user_id: targetUserId,
      message_id: messageData.id,
      broadcast_result: result
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: messageData.id,
        delivery_mode: wantsBroadcast ? 'broadcast_all' : 'targeted',
        target_user_id: targetUserId,
        broadcast_result: result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing proactive message:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
