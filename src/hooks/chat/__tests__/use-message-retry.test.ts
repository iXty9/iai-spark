
import { renderHook, act } from '@testing-library/react';
import { useMessageRetry } from '../use-message-retry';

// Mock toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    error: jest.fn()
  }
}));

// Mock debug events
jest.mock('@/utils/debug-events', () => ({
  emitDebugEvent: jest.fn()
}));

describe('useMessageRetry', () => {
  let mockHandleSubmit: jest.MockedFunction<() => void>;

  beforeEach(() => {
    mockHandleSubmit = jest.fn();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderRetryHook = (maxRetries = 3) => {
    return renderHook(() => useMessageRetry({ 
      handleSubmit: mockHandleSubmit, 
      maxRetries 
    }));
  };

  it('should initialize with currentAttempt as 0', () => {
    const { result } = renderRetryHook();
    
    expect(result.current.currentAttempt).toBe(0);
  });

  it('should retry on error within maxRetries limit', () => {
    const { result } = renderRetryHook(3);
    const error = new Error('Test error');
    
    act(() => {
      result.current.incrementAttempt();
    });
    
    const shouldRetry = result.current.handleRetry(error);
    
    expect(shouldRetry).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('should not retry when maxRetries exceeded', () => {
    const { result } = renderRetryHook(2);
    const error = new Error('Test error');
    
    // Simulate 3 attempts (exceeding max of 2)
    act(() => {
      result.current.incrementAttempt();
      result.current.incrementAttempt();
      result.current.incrementAttempt();
    });
    
    const shouldRetry = result.current.handleRetry(error);
    
    expect(shouldRetry).toBe(false);
    expect(mockHandleSubmit).not.toHaveBeenCalled();
  });

  it('should not retry on abort errors', () => {
    const { result } = renderRetryHook();
    const abortError = new Error('Request was aborted');
    
    const shouldRetry = result.current.handleRetry(abortError);
    
    expect(shouldRetry).toBe(false);
    expect(mockHandleSubmit).not.toHaveBeenCalled();
  });

  it('should clear retry timeout when clearRetry is called', () => {
    const { result } = renderRetryHook();
    const error = new Error('Test error');
    
    act(() => {
      result.current.incrementAttempt();
      result.current.handleRetry(error);
    });
    
    act(() => {
      result.current.clearRetry();
    });
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(mockHandleSubmit).not.toHaveBeenCalled();
  });

  it('should reset attempts to 0', () => {
    const { result } = renderRetryHook();
    
    act(() => {
      result.current.incrementAttempt();
      result.current.incrementAttempt();
    });
    
    expect(result.current.currentAttempt).toBe(2);
    
    act(() => {
      result.current.resetAttempts();
    });
    
    expect(result.current.currentAttempt).toBe(0);
  });
});
