
import { processMessage } from '../message-processor';
import { Message } from '@/types/chat';

// Mock dependencies
jest.mock('@/services/webhook', () => ({
  sendWebhookMessage: jest.fn()
}));

jest.mock('@/utils/debug', () => ({
  parseWebhookResponse: jest.fn()
}));

jest.mock('@/utils/debug-events', () => ({
  emitDebugEvent: jest.fn()
}));

jest.mock('@/utils/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('processMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process message successfully', async () => {
    const { sendWebhookMessage } = require('@/services/webhook');
    const { parseWebhookResponse } = require('@/utils/debug');
    
    sendWebhookMessage.mockResolvedValue({ text: 'AI Response' });
    parseWebhookResponse.mockReturnValue('AI Response');
    
    const onMessageStart = jest.fn();
    const onMessageComplete = jest.fn();
    
    const result = await processMessage({
      message: 'Test message',
      isAuthenticated: true,
      onMessageStart,
      onMessageComplete
    });
    
    expect(result.content).toBe('AI Response');
    expect(result.sender).toBe('ai');
    expect(onMessageStart).toHaveBeenCalled();
    expect(onMessageComplete).toHaveBeenCalledWith(result);
  });

  it('should handle errors gracefully', async () => {
    const { sendWebhookMessage } = require('@/services/webhook');
    
    sendWebhookMessage.mockRejectedValue(new Error('Network error'));
    
    const onError = jest.fn();
    
    const result = await processMessage({
      message: 'Test message',
      isAuthenticated: false,
      onError
    });
    
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.content).toContain('error');
  });

  it('should handle cancellation', async () => {
    const { sendWebhookMessage } = require('@/services/webhook');
    const { parseWebhookResponse } = require('@/utils/debug');
    
    sendWebhookMessage.mockResolvedValue({ text: 'AI Response' });
    parseWebhookResponse.mockReturnValue('AI Response');
    
    const result = await processMessage({
      message: 'Test message',
      isAuthenticated: true
    });
    
    expect(typeof result.cancel).toBe('function');
    
    // Test cancellation
    if (result.cancel) {
      result.cancel();
    }
  });
});
