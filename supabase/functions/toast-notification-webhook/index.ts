
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

    // Create the notification data with correct structure
    const notificationData = {
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      timestamp: new Date().toISOString()
    }

    console.log('Prepared notification data:', notificationData)

    // Use Supabase Realtime to broadcast the toast notification
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store notification in database (server-side only, once per toast)
    const storeNotificationInDB = async (userId: string) => {
      try {
        const { error } = await supabase
          .from('user_notifications')
          .insert({
            user_id: userId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            sender: payload.sender || 'System',
            source: 'websocket',
            metadata: {
              source: 'websocket',
              timestamp: notificationData.timestamp,
              notification_id: notificationData.id
            }
          })

        if (error) {
          console.error('Error storing notification for user', userId, error)
        } else {
          console.log('Notification stored successfully for user', userId)
        }
      } catch (error) {
        console.error('Failed to store notification for user', userId, error)
      }
    }

    // Use consistent channel name with hyphen
    const channel = supabase.channel('toast-notifications')
    
    console.log('Created toast-notifications channel')

    // Send with consistent payload structure and store in database
    if (payload.user_id) {
      // Send to specific user and store in their notifications
      await storeNotificationInDB(payload.user_id)
      
      const payloadStructure = {
        data: notificationData,
        target_user: payload.user_id
      };
      
      console.log('Sending targeted toast with payload:', payloadStructure);
      
      const result = await channel.send({
        type: 'broadcast',
        event: 'toast_notification',
        payload: payloadStructure
      })
      console.log('Sent targeted toast notification result:', result)
    } else if (payload.target_users && payload.target_users.length > 0) {
      // Send to specific users and store in each user's notifications
      for (const userId of payload.target_users) {
        await storeNotificationInDB(userId)
        
        const payloadStructure = {
          data: notificationData,
          target_user: userId
        };
        
        console.log(`Sending toast to user ${userId} with payload:`, payloadStructure);
        
        const result = await channel.send({
          type: 'broadcast',
          event: 'toast_notification',
          payload: payloadStructure
        })
        console.log(`Sent toast notification to user ${userId} result:`, result)
      }
    } else {
      // Broadcast to all users - get all authenticated users and store for each
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id')

        if (error) {
          console.error('Error fetching profiles for broadcast notification storage:', error)
        } else if (profiles && profiles.length > 0) {
          // Store notification for all users
          for (const profile of profiles) {
            await storeNotificationInDB(profile.id)
          }
          console.log(`Stored broadcast notification for ${profiles.length} users`)
        }
      } catch (error) {
        console.error('Failed to store broadcast notifications:', error)
      }
      
      const payloadStructure = {
        data: notificationData
      };
      
      console.log('Sending broadcast toast with payload:', payloadStructure);
      
      const result = await channel.send({
        type: 'broadcast',
        event: 'toast_notification',
        payload: payloadStructure
      })
      console.log('Sent broadcast toast notification result:', result)
    }

    // Clean up the channel
    await supabase.removeChannel(channel)

    console.log('Toast notification sent successfully')

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Toast notification sent successfully',
      notification_id: notificationData.id,
      debug_data: notificationData
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
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
