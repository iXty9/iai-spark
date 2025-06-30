
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

  it('should update messages correctly', () => {
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
    
    act(() => {
      result.current.updateMessage('1', { content: 'Updated message' });
    });
    
    expect(result.current.messages[0].content).toBe('Updated message');
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

  it('should set messages array correctly', () => {
    const { result } = renderHook(() => useMessageState());
    
    const testMessages: Message[] = [
      {
        id: '1',
        content: 'First message',
        sender: 'user',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        content: 'Second message',
        sender: 'ai',
        timestamp: new Date().toISOString()
      }
    ];
    
    act(() => {
      result.current.setMessages(testMessages);
    });
    
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages).toEqual(testMessages);
  });
});
