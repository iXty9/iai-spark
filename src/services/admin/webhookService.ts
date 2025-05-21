
// This is a mock implementation of the webhook service
// It's needed because the original_WebhookSettings.tsx references it but we're not using that component
import { logger } from '@/utils/logging';
import { withSupabase } from '@/utils/supabase-helpers';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchWebhooks(): Promise<Webhook[]> {
  try {
    logger.info('Fetching webhooks');
    // This is a mock implementation
    return [];
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    throw new Error('Failed to fetch webhooks');
  }
}

export async function createWebhook(
  name: string,
  url: string,
  events: string[],
  is_active: boolean
): Promise<Webhook> {
  try {
    logger.info('Creating webhook:', { name, url });
    // This is a mock implementation
    return {
      id: 'mock-id',
      name,
      url,
      events,
      is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error creating webhook:', error);
    throw new Error('Failed to create webhook');
  }
}

export async function updateWebhook(
  id: string,
  name: string,
  url: string,
  events: string[],
  is_active: boolean
): Promise<Webhook> {
  try {
    logger.info('Updating webhook:', { id, name, url });
    // This is a mock implementation
    return {
      id,
      name,
      url,
      events,
      is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error updating webhook:', error);
    throw new Error('Failed to update webhook');
  }
}

export async function deleteWebhook(id: string): Promise<void> {
  try {
    logger.info('Deleting webhook:', { id });
    // This is a mock implementation
    return;
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    throw new Error('Failed to delete webhook');
  }
}
