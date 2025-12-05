import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logging';
import { sanitizeInput, validateWebhookUrl } from '@/utils/validation';

export interface AdminProfileData {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  webhook_url?: string | null;
  theme_settings?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  location_address?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  location_permission_granted?: boolean | null;
  location_auto_update?: boolean | null;
  updated_at?: string | null;
  // Custom webhook fields
  custom_webhook_enabled?: boolean | null;
  custom_webhook_auth_header_name?: string | null;
  custom_webhook_auth_header_value?: string | null;
  custom_webhook_use_auth?: boolean | null;
}

export interface AdminProfileUpdateData {
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  phone_country_code?: string;
  webhook_url?: string;
  // Custom webhook fields
  custom_webhook_enabled?: boolean;
  custom_webhook_auth_header_name?: string;
  custom_webhook_auth_header_value?: string;
  custom_webhook_use_auth?: boolean;
}

/**
 * Fetch any user's profile by ID (admin only - enforced by RLS)
 */
export async function fetchUserProfile(userId: string): Promise<AdminProfileData | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Admin: Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Admin: Unexpected error fetching user profile:', error);
    return null;
  }
}

/**
 * Update any user's profile (admin only - enforced by RLS)
 */
export async function updateUserProfile(
  userId: string,
  updates: AdminProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize text inputs
    const sanitizedUpdates: Record<string, any> = {};

    if (updates.username !== undefined) {
      sanitizedUpdates.username = sanitizeInput(updates.username);
    }

    if (updates.first_name !== undefined) {
      sanitizedUpdates.first_name = sanitizeInput(updates.first_name);
    }

    if (updates.last_name !== undefined) {
      sanitizedUpdates.last_name = sanitizeInput(updates.last_name);
    }

    if (updates.phone_number !== undefined) {
      sanitizedUpdates.phone_number = updates.phone_number;
    }

    if (updates.phone_country_code !== undefined) {
      sanitizedUpdates.phone_country_code = updates.phone_country_code;
    }

    // Validate webhook URL if provided
    if (updates.webhook_url !== undefined && updates.webhook_url) {
      const webhookError = validateWebhookUrl(updates.webhook_url);
      if (webhookError) {
        return { success: false, error: webhookError };
      }
      sanitizedUpdates.webhook_url = updates.webhook_url;
    } else if (updates.webhook_url === '') {
      sanitizedUpdates.webhook_url = null;
    }

    // Handle custom webhook fields
    if (updates.custom_webhook_enabled !== undefined) {
      sanitizedUpdates.custom_webhook_enabled = updates.custom_webhook_enabled;
    }

    if (updates.custom_webhook_auth_header_name !== undefined) {
      sanitizedUpdates.custom_webhook_auth_header_name = updates.custom_webhook_auth_header_name || null;
    }

    if (updates.custom_webhook_auth_header_value !== undefined) {
      sanitizedUpdates.custom_webhook_auth_header_value = updates.custom_webhook_auth_header_value || null;
    }

    if (updates.custom_webhook_use_auth !== undefined) {
      sanitizedUpdates.custom_webhook_use_auth = updates.custom_webhook_use_auth;
    }

    const { error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId);

    if (error) {
      logger.error('Admin: Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    logger.info('Admin: Profile updated successfully for user:', userId);
    return { success: true };
  } catch (error: any) {
    logger.error('Admin: Unexpected error updating user profile:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get user's email from auth (requires edge function for security)
 * For now, we pass email from the user list which already has it
 */
export function formatUserDisplayName(profile: AdminProfileData | null, email?: string): string {
  if (!profile) return email || 'Unknown User';
  
  if (profile.first_name || profile.last_name) {
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  }
  
  return profile.username || email || 'Unknown User';
}
