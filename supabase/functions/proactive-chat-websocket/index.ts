
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Connection registry to track active WebSocket connections
const connections = new Map<string, { socket: WebSocket; userId: string; sessionId: string }>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  // Extract authentication token from headers
  const authHeader = headers.get("authorization");
  const apikey = headers.get("apikey");
  
  if (!authHeader || !apikey) {
    return new Response("Missing authentication", { 
      status: 401,
      headers: corsHeaders 
    });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Verify user authentication
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Authentication failed:', authError);
    return new Response("Authentication failed", { 
      status: 401,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  const connectionId = `${user.id}_${sessionId}`;

  console.log(`WebSocket connection established for user ${user.id}, session ${sessionId}`);

  socket.onopen = () => {
    // Register connection
    connections.set(connectionId, {
      socket,
      userId: user.id,
      sessionId
    });

    console.log(`Connection registered: ${connectionId}, total connections: ${connections.size}`);
    
    // Send connection confirmation
    socket.send(JSON.stringify({
      type: 'connection_established',
      sessionId,
      userId: user.id,
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Received message from ${user.id}:`, message);
      
      // Handle ping/pong for connection health
      if (message.type === 'ping') {
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    connections.delete(connectionId);
    console.log(`Connection closed: ${connectionId}, remaining connections: ${connections.size}`);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    connections.delete(connectionId);
  };

  return response;
});

// Export function to send messages to specific users (used by incoming webhook)
export const sendMessageToUser = (userId: string, message: any) => {
  let sent = 0;
  
  // Find all connections for the user
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.userId === userId) {
      try {
        connection.socket.send(JSON.stringify(message));
        sent++;
      } catch (error) {
        console.error(`Failed to send message to connection ${connectionId}:`, error);
        connections.delete(connectionId);
      }
    }
  }
  
  console.log(`Sent message to ${sent} connections for user ${userId}`);
  return sent;
};

// Export function to broadcast messages to all connections
export const broadcastMessage = (message: any) => {
  let sent = 0;
  
  for (const [connectionId, connection] of connections.entries()) {
    try {
      connection.socket.send(JSON.stringify(message));
      sent++;
    } catch (error) {
      console.error(`Failed to broadcast message to connection ${connectionId}:`, error);
      connections.delete(connectionId);
    }
  }
  
  console.log(`Broadcast message to ${sent} connections`);
  return sent;
};
