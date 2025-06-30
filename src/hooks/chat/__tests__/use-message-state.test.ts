
import { renderHook, act } from '@testing-library/react';
import { useMessageState } from '../use-message-state';
import { Message } from '@/types/chat';

// Mock dependencies
jest.mock('@/services/storage/chatPersistenceService', () => ({
  saveChatHistory: jest.fn(),
  loadChatHistory: jest.fn(() => []),
  clearChatHistory: jest.fn()
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn()
  }
}));

jest.mock('@/utils/debug-events', () => ({
  emitDebugEvent: jest.fn()
}));

describe('useMessageState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty messages array', () => {
    const { result } = renderHook(() => useMessageState());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.message).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('should add messages correctly', () => {
    const { result } = renderHook(() => useMessageState());
    
    const testMessage: Message = {
      id: '1',
      content: 'Test message',
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    act(() => {
      result.current.addMessage(testMessage);
    });
    
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(testMessage);
  });

  it('should clear messages correctly', () => {
    const { result } = renderHook(() => useMessageState());
    
    const testMessage: Message = {
      id: '1',
      content: 'Test message',
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    act(() => {
      result.current.addMessage(testMessage);
    });
    
    expect(result.current.messages).toHaveLength(1);
    
    act(() => {
      result.current.clearMessages();
    });
    
    expect(result.current.messages).toHaveLength(0);
  });

  it('should update message input', () => {
    const { result } = renderHook(() => useMessageState());
    
    act(() => {
      result.current.setMessage('New message');
    });
    
    expect(result.current.message).toBe('New message');
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useMessageState());
    
    act(() => {
      result.current.setMessage('Test message');
      result.current.setIsLoading(true);
    });
    
    act(() => {
      result.current.resetState();
    });
    
    expect(result.current.message).toBe('');
    expect(result.current.isLoading).toBe(false);
  });
});
