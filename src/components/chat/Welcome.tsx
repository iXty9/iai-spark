
import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, Circle, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { emitDebugEvent } from '@/utils/debug-events';
import { useDevMode } from '@/store/use-dev-mode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { Skeleton } from '@/components/ui/skeleton';

interface WelcomeProps {
  onStartChat: (message: string) => void;
  onImportChat: (messages: Message[]) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat, onImportChat }) => {
  const [message, setMessage] = React.useState('');
  const [tagline, setTagline] = React.useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const [avatarError, setAvatarError] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const hasSubmitted = useRef<boolean>(false);
  const { isDevMode } = useDevMode();
  
  // Use the text area resize hook
  useTextareaResize(textareaRef, message);
  
  useEffect(() => {
    // Load app settings
    const loadSettings = async () => {
      try {
        const settings = await fetchAppSettings();
        setTagline(settings.app_name || "The Everywhere Intelligent Assistant");
        setAvatarUrl(settings.avatar_url || "https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png");
        
        // Set the document title if available
        if (settings.site_title && typeof document !== 'undefined') {
          document.title = settings.site_title;
        }
      } catch (error) {
        console.error('Error loading app settings:', error);
        // Use defaults if settings can't be loaded
        setTagline("The Everywhere Intelligent Assistant");
        setAvatarUrl("https://ixty9.com/wp-content/uploads/2024/05/faviconV4.png");
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    loadSettings();
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    
    // Debug only - separated from core functionality
    if (process.env.NODE_ENV === 'development' || isDevMode) {
      emitDebugEvent({
        screen: 'Welcome Screen',
        lastAction: 'Welcome screen loaded',
        isLoading: false,
        hasInteracted: false,
        isTransitioning: false
      });
    }
  }, [isDevMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If Shift+Enter is pressed, allow default behavior (line break)
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior for Shift+Enter (creates a line break)
    }
    
    // Only submit on plain Enter key (no Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  // Core business logic separated from debugging
  const submitMessage = () => {
    // Prevent multiple submissions
    if (isSubmitting || hasSubmitted.current) {
      logger.warn('Welcome screen: Submission prevented - already submitting', null, { module: 'ui' });
      return;
    }
    
    if (!message.trim()) {
      logger.warn('Welcome screen: Empty message prevented', null, { module: 'ui' });
      
      // Debug only - separated from core functionality
      if (process.env.NODE_ENV === 'development' || isDevMode) {
        emitDebugEvent({
          lastAction: 'Submit prevented: Empty message',
          isLoading: false
        });
      }
      return;
    }
    
    logger.info('Welcome screen: Starting chat with message', {
      message: message.trim(),
      timestamp: new Date().toISOString()
    }, { module: 'ui' });
    
    // Debug only - separated from core functionality
    if (process.env.NODE_ENV === 'development' || isDevMode) {
      emitDebugEvent({
        lastAction: `Welcome screen: Submit clicked with message: "${message.trim()}" (Using real webhook)`,
        isLoading: true,
        inputState: 'Submitting',
        isTransitioning: true
      });
    }
    
    setIsSubmitting(true);
    hasSubmitted.current = true;
    
    const messageToSend = message.trim();
    setMessage('');
    
    // We use setTimeout to ensure React state updates complete before transition
    setTimeout(() => {
      // Debug only - separated from core functionality
      if (process.env.NODE_ENV === 'development' || isDevMode) {
        emitDebugEvent({
          lastAction: 'Starting chat from welcome screen (Using real webhook)',
          isTransitioning: true,
          hasInteracted: true
        });
      }
      
      // Core business logic
      onStartChat(messageToSend);
    }, 0);
  };

  const handleImageError = () => {
    logger.debug("Avatar image failed to load", null, { module: 'ui' });
    setAvatarError(true);
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      {isDevMode && (
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertDescription>
            Welcome flow is using real webhook integration
          </AlertDescription>
        </Alert>
      )}
      
      <div className="w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16 relative">
            {isLoadingSettings ? (
              <Skeleton className="w-16 h-16 rounded-full" />
            ) : !avatarError && avatarUrl ? (
              <AvatarImage 
                src={avatarUrl}
                alt="Ixty AI Logo" 
                onError={handleImageError}
              />
            ) : null}
            <AvatarFallback className="bg-[#ea384c]/10 text-[#ea384c] font-bold flex items-center justify-center">
              <div className="relative">
                <Circle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#ea384c] w-full h-full" />
                <Info className="relative z-10 text-[#ea384c]" size={18} />
              </div>
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold text-[#ea384c]">Ixty AI</h1>
            {isLoadingSettings ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <p className="text-muted-foreground">
                "{tagline}"
              </p>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
            className="flex-1 rounded-lg shadow-sm min-h-[60px] max-h-[150px] resize-none"
            disabled={isSubmitting}
            aria-label="Message input"
            spellCheck="true"
            rows={1}
          />
          <div className="flex items-center justify-end mt-2">
            <Button 
              type="submit" 
              disabled={!message.trim() || isSubmitting} 
              className="rounded-full bg-[#ea384c] hover:bg-[#dd3333]"
            >
              {isMobile ? <Send className="h-4 w-4" /> : <>Send <Send className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
