
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const ToastNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  type: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
  user_id: z.string().uuid().optional(),
  target_users: z.array(z.string().uuid()).max(100).optional(),
  sender: z.string().min(1).max(100).optional(),
});

type ToastNotificationPayload = z.infer<typeof ToastNotificationSchema>;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const validation = ToastNotificationSchema.safeParse(rawBody);
    
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

    const payload: ToastNotificationPayload = validation.data;

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store notification in database (server-side only, once per toast)
    const storeNotificationInDB = async (userId: string) => {
      try {
        const { error } = await supabase
          .from('user_notifications')
          .upsert({
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
          }, {
            onConflict: 'user_id,notification_id_extracted',
            ignoreDuplicates: true
          })

        if (error) {
          console.error('Error storing notification for user', userId, error)
        } else {
          console.log('Notification stored successfully for user', userId, ' (or skipped if duplicate)')
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
        ...corsHeaders,
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
        ...corsHeaders,
      },
    })
  }
})
