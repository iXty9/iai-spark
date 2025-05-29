
import { renderHook, act } from '@testing-library/react';
import { useSubmitState } from '../use-submit-state';

// Mock debug events
jest.mock('@/utils/debug-events', () => ({
  emitDebugEvent: jest.fn()
}));

describe('useSubmitState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with isSubmitting as false', () => {
    const { result } = renderHook(() => useSubmitState());
    
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should update submitting state correctly', () => {
    const { result } = renderHook(() => useSubmitState());
    
    act(() => {
      result.current.setSubmitting(true);
    });
    
    expect(result.current.isSubmitting).toBe(true);
    
    act(() => {
      result.current.setSubmitting(false);
    });
    
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should emit debug events when submitting state changes', () => {
    const { emitDebugEvent } = require('@/utils/debug-events');
    const { result } = renderHook(() => useSubmitState());
    
    act(() => {
      result.current.setSubmitting(true);
    });
    
    expect(emitDebugEvent).toHaveBeenCalledWith({
      lastAction: 'Message submission starting',
      isLoading: true,
      inputState: 'Sending'
    });
    
    act(() => {
      result.current.setSubmitting(false);
    });
    
    expect(emitDebugEvent).toHaveBeenCalledWith({
      lastAction: 'Message submission completed',
      isLoading: false,
      inputState: 'Ready'
    });
  });
});
