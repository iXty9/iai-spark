
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

// Helper function to persist message to active_chat_messages
async function persistMessageForUser(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  messageData: {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('active_chat_messages')
      .insert({
        user_id: userId,
        message_id: messageData.id,
        sender: 'ai', // Proactive messages appear as AI messages
        content: messageData.content,
        timestamp: messageData.timestamp,
        source: 'proactive',
        metadata: {
          ...messageData.metadata,
          original_sender: messageData.sender
        }
      });

    if (error) {
      // Ignore duplicate key errors (message already exists)
      if (error.code === '23505') {
        console.log('Message already exists for user:', userId);
        return true;
      }
      console.error('Error persisting message for user:', userId, error);
      return false;
    }
    
    console.log('Message persisted for user:', userId);
    return true;
  } catch (err) {
    console.error('Exception persisting message for user:', userId, err);
    return false;
  }
}

// Background task to persist broadcast messages for all users
async function persistBroadcastMessages(
  supabaseClient: ReturnType<typeof createClient>,
  messageData: {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // Fetch all user IDs from profiles table
    const { data: profiles, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('id');

    if (fetchError) {
      console.error('Error fetching user profiles for broadcast:', fetchError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users found for broadcast persistence');
      return;
    }

    console.log(`Persisting broadcast message for ${profiles.length} users`);

    // Batch insert messages for all users
    const insertRecords = profiles.map(profile => ({
      user_id: profile.id,
      message_id: `${messageData.id}_${profile.id}`, // Unique per user for broadcasts
      sender: 'ai',
      content: messageData.content,
      timestamp: messageData.timestamp,
      source: 'proactive_broadcast',
      metadata: {
        ...messageData.metadata,
        original_sender: messageData.sender,
        broadcast_message_id: messageData.id
      }
    }));

    // Insert in batches of 100 to avoid overwhelming the database
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < insertRecords.length; i += batchSize) {
      const batch = insertRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from('active_chat_messages')
        .insert(batch);

      if (insertError) {
        // Some may fail due to duplicates, that's ok
        if (insertError.code !== '23505') {
          console.error('Batch insert error:', insertError);
          errorCount += batch.length;
        }
      } else {
        successCount += batch.length;
      }
    }

    console.log(`Broadcast persistence complete: ${successCount} succeeded, ${errorCount} failed`);
  } catch (err) {
    console.error('Exception in broadcast persistence:', err);
  }
}

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

    // PERSIST MESSAGE TO DATABASE
    let persisted = false;
    
    if (wantsBroadcast) {
      // For broadcasts, persist in background to avoid timeout
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(persistBroadcastMessages(supabaseClient, messageData));
        persisted = true; // Assume success for background task
        console.log('Broadcast persistence queued as background task');
      } else {
        // Fallback: persist synchronously (may timeout for large user bases)
        await persistBroadcastMessages(supabaseClient, messageData);
        persisted = true;
      }
    } else if (targetUserId) {
      // For targeted messages, persist synchronously
      persisted = await persistMessageForUser(supabaseClient, targetUserId, messageData);
    }

    console.log('Sending proactive message:', {
      messageData,
      targetUserId,
      deliveryMode: wantsBroadcast ? 'broadcast_all' : 'targeted',
      channelName: 'proactive-messages',
      persisted
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
      broadcast_result: result,
      persisted
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: messageData.id,
        delivery_mode: wantsBroadcast ? 'broadcast_all' : 'targeted',
        target_user_id: targetUserId,
        broadcast_result: result,
        persisted
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
