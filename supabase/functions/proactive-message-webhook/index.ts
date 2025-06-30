
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProactiveMessageRequest {
  user_id?: string;
  username?: string;
  message: string;
  sender?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the incoming request
    const body: ProactiveMessageRequest = await req.json();
    
    if (!body.message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let targetUserId = body.user_id;

    // If username is provided instead of user_id, look up the user
    if (!targetUserId && body.username) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', body.username)
        .single();
      
      if (profile) {
        targetUserId = profile.id;
      }
    }

    // Create the message object with correct field names for client
    const messageData = {
      id: crypto.randomUUID(),
      content: body.message, // Use 'content' not 'message'
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
      channelName: 'proactive-messages'
    });

    // Use consistent channel name with hyphen
    const channel = supabaseClient.channel('proactive-messages');
    
    // Send message with consistent payload structure
    const payload = {
      data: messageData,
      target_user: targetUserId || undefined
    };

    console.log('Broadcasting with payload structure:', payload);

    const result = await channel.send({
      type: 'broadcast',
      event: 'proactive_message', // Consistent event name
      payload: payload
    });

    console.log('Broadcast result:', result);

    // Clean up the channel
    await supabaseClient.removeChannel(channel);

    console.log('Proactive message sent successfully', {
      user_id: targetUserId,
      username: body.username,
      message_id: messageData.id,
      broadcast_result: result
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: messageData.id,
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
