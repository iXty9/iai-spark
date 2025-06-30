
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface ToastNotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  user_id?: string;
  target_users?: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const payload: ToastNotificationPayload = await req.json()
    
    if (!payload.title || !payload.message) {
      return new Response('Missing required fields: title and message', { status: 400 })
    }

    console.log('Received toast notification:', payload)

    // Create the notification event for WebSocket broadcasting
    const notificationEvent = {
      type: 'toast_notification',
      data: {
        id: crypto.randomUUID(),
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
        timestamp: new Date().toISOString()
      }
    }

    // Use Supabase Realtime to broadcast the toast notification
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create the channel
    const channel = supabase.channel('toast-notifications')
    
    console.log('Created toast-notifications channel')

    // Send the messages directly without subscribing (edge functions can send without subscribing)
    if (payload.user_id) {
      // Send to specific user
      const result = await channel.send({
        type: 'broadcast',
        event: 'toast_notification',
        payload: {
          ...notificationEvent,
          target_user: payload.user_id
        }
      })
      console.log('Sent targeted toast notification:', result)
    } else if (payload.target_users && payload.target_users.length > 0) {
      // Send to specific users
      for (const userId of payload.target_users) {
        const result = await channel.send({
          type: 'broadcast',
          event: 'toast_notification',
          payload: {
            ...notificationEvent,
            target_user: userId
          }
        })
        console.log(`Sent toast notification to user ${userId}:`, result)
      }
    } else {
      // Broadcast to all users
      const result = await channel.send({
        type: 'broadcast',
        event: 'toast_notification',
        payload: notificationEvent
      })
      console.log('Sent broadcast toast notification:', result)
    }

    // Clean up the channel
    await supabase.removeChannel(channel)

    console.log('Toast notification sent successfully')

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Toast notification sent successfully',
      notification_id: notificationEvent.data.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error processing toast notification:', error)
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
