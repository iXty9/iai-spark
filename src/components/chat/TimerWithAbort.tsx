
import React, { useState, useEffect, useCallback } from 'react';
import { Stop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface TimerWithAbortProps {
  startTime: number;
  onAbort?: () => void;
  isVisible: boolean;
}

export const TimerWithAbort: React.FC<TimerWithAbortProps> = ({ 
  startTime,
  onAbort,
  isVisible
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // Format seconds as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Update timer every second
  useEffect(() => {
    if (!isVisible) return;
    
    setIsMounted(true);
    
    const calculateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      return elapsed;
    };
    
    // Initial calculation
    setElapsedSeconds(calculateElapsed());
    
    // Update timer every second
    const timerId = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);
    
    return () => {
      clearInterval(timerId);
    };
  }, [startTime, isVisible]);
  
  // Handle abort action
  const handleAbort = useCallback(() => {
    if (onAbort) {
      onAbort();
      toast.info("Request canceled");
    }
  }, [onAbort]);
  
  if (!isVisible || !isMounted) return null;
  
  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground ml-2">
      <span className={`transition-colors ${elapsedSeconds > 60 ? 'text-amber-500' : ''} ${elapsedSeconds > 120 ? 'text-red-500' : ''}`}>
        {formatTime(elapsedSeconds)}
      </span>
      {onAbort && (
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 rounded-full p-0"
          onClick={handleAbort}
          aria-label="Cancel request"
          title="Cancel request"
        >
          <Stop className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
