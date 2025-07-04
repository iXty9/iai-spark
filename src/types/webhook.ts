/**
 * Webhook-related type definitions
 */

export interface WebhookResponse {
  success: boolean;
  error?: string;
  threadId?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tokenInfo?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TestResult {
  type: 'proactive' | 'toast';
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
  details?: WebhookResponse;
}

export interface WebhookUrls {
  proactive: string;
  toast: string;
}

export interface ProactiveMessagePayload {
  message: string;
  sender?: string;
  metadata?: Record<string, unknown>;
}

export interface ToastNotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  user_id?: string;
  target_users?: string[];
}