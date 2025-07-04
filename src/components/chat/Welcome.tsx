
import React, { useEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, Circle, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { emitDebugEvent } from '@/utils/debug-events';
import { useDevMode } from '@/store/use-dev-mode';
import { Textarea } from '@/components/ui/textarea';
import { useTextareaResize } from '@/hooks/use-textarea-resize';
import { Message } from '@/types/chat';
import { logger } from '@/utils/logging';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebSocket, ProactiveMessage } from '@/contexts/WebSocketContext';

const DEFAULT_TAGLINE = "The Everywhere Intelligent Assistant";

interface WelcomeProps {
  onStartChat: (message: string) => void;
  onImportChat: (messages: Message[]) => void;
  onProactiveTransition?: (message: ProactiveMessage) => void;
}

// Mobile Safari detection helper
const isMobileSafari = () => {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) && 
         /^((?!chrome|android).)*safari/i.test(userAgent);
};

export const Welcome: React.FC<WelcomeProps> = ({ onStartChat, onProactiveTransition }) => {
  const [message, setMessage] = useState('');
  const [tagline, setTagline] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const { isDevMode } = useDevMode();
  const { onProactiveMessage } = useWebSocket();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSubmitted = useRef(false);
  const isTransitioning = useRef(false);

  useTextareaResize(textareaRef, message);

  // Enhanced proactive message handling for mobile Safari
  useEffect(() => {
    const unsubscribe = onProactiveMessage((proactiveMessage: ProactiveMessage) => {
      const mobile = isMobileSafari();
      
      logger.info('Welcome screen received proactive message', {
        messageId: proactiveMessage.id,
        sender: proactiveMessage.sender,
        isMobile: mobile,  
        isTransitioning: isTransitioning.current,
        hasSubmitted: hasSubmitted.current,
        module: 'welcome-mobile'
      });
      
      // Prevent processing if already transitioning or submitted
      if (isTransitioning.current || hasSubmitted.current) {
        logger.warn('Proactive message ignored - already transitioning', {
          messageId: proactiveMessage.id,
          isTransitioning: isTransitioning.current,
          hasSubmitted: hasSubmitted.current,
          module: 'welcome-mobile'
        });
        return;
      }

      // Mobile Safari specific handling
      if (mobile) {
        logger.info('Processing proactive message for mobile Safari', {
          messageId: proactiveMessage.id,
          module: 'welcome-mobile'
        });

        // Set transition flags immediately
        isTransitioning.current = true;
        hasSubmitted.current = true;

        // Add a small delay for mobile Safari state consistency
        setTimeout(() => {
          try {
            if (onProactiveTransition) {
              onProactiveTransition(proactiveMessage);
              logger.info('Mobile Safari proactive transition completed', {
                messageId: proactiveMessage.id,
                module: 'welcome-mobile'
              });
            }
          } catch (error) {
            logger.error('Error in mobile Safari proactive transition:', error, {
              messageId: proactiveMessage.id,
              module: 'welcome-mobile'
            });
            // Reset flags on error
            isTransitioning.current = false;
            hasSubmitted.current = false;
          }
        }, 150); // Slightly longer delay for mobile Safari
      } else {
        // Desktop handling - immediate
        isTransitioning.current = true;
        hasSubmitted.current = true;
        
        setTimeout(() => {
          if (onProactiveTransition) {
            onProactiveTransition(proactiveMessage);
          }
        }, 100);
      }
    });

    return unsubscribe;
  }, [onProactiveMessage, onProactiveTransition]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchAppSettings();
        setTagline(settings.app_name || DEFAULT_TAGLINE);
        setAvatarUrl(settings.default_avatar_url || null);
        if (settings.site_title && typeof document !== 'undefined') {
          document.title = settings.site_title;
        }
      } catch (e) {
        logger.warn('Failed to load app settings, using defaults', e, { module: 'welcome' });
        setTagline(DEFAULT_TAGLINE);
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
    textareaRef.current?.focus();

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

  const submitMessage = () => {
    if (isSubmitting || hasSubmitted.current || isTransitioning.current || !message.trim()) {
      if (!message.trim() && (process.env.NODE_ENV === 'development' || isDevMode)) {
        emitDebugEvent({ lastAction: 'Submit prevented: Empty message', isLoading: false });
      }
      logger.warn(
        `Welcome screen: ${!message.trim() ? 'Empty message prevented' : 'Submission prevented - already submitting/transitioning'}`, 
        null, 
        { module: 'ui' }
      );
      return;
    }

    logger.info('Welcome screen: Starting chat with message', {
      message: message.trim(),
      timestamp: new Date().toISOString(),
      isMobile: isMobileSafari()
    }, { module: 'ui' });

    if (process.env.NODE_ENV === 'development' || isDevMode) {
      emitDebugEvent({
        lastAction: `Welcome screen: Submit clicked with message: "${message.trim()}" (Using real webhook)`,
        isLoading: true,
        inputState: 'Submitting',
        isTransitioning: true
      });
    }

    setSubmitting(true);
    hasSubmitted.current = true;
    isTransitioning.current = true;
    const messageToSend = message.trim();
    setMessage('');
    
    setTimeout(() => {
      if (process.env.NODE_ENV === 'development' || isDevMode) {
        emitDebugEvent({
          lastAction: 'Starting chat from welcome screen (Using real webhook)',
          isTransitioning: true,
          hasInteracted: true
        });
      }
      onStartChat(messageToSend);
    }, 0);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value);
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); submitMessage(); };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(); }
  };

  const handleAvatarError = () => {
    logger.warn('Avatar failed to load, falling back to default', { 
      attemptedUrl: avatarUrl,
      module: 'welcome' 
    });
    setAvatarError(true);
  };

  // Avatar rendering logic helper
  const renderAvatar = () => {
    if (isLoading) {
      return <Skeleton className="w-16 h-16 rounded-full bg-muted/10 animate-pulse" />;
    }
    
    if (!avatarError && avatarUrl) {
      return (
        <AvatarImage 
          src={avatarUrl} 
          alt="Ixty AI Logo" 
          onError={handleAvatarError}
          onLoad={() => logger.debug('Avatar loaded successfully', { url: avatarUrl, module: 'welcome' })}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4 animate-fade-in">
      <div className="w-full text-center space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Avatar className="w-16 h-16 relative">
            {renderAvatar()}
            <AvatarFallback className="bg-[#ea384c]/10 text-[#ea384c] font-bold flex items-center justify-center">
              <div className="relative">
                <Circle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#ea384c] w-full h-full" />
                <Info className="relative z-10 text-[#ea384c]" size={18} />
              </div>
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold text-[#ea384c] animate-fade-in">Ixty AI</h1>
            {isLoading ? (
              <Skeleton className="h-5 w-64 bg-muted/20" />
            ) : (
              <p className="text-muted-foreground animate-fade-in">&quot;{tagline}&quot;</p>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Ask me anything..." : "What can I assist you with today?"}
            className="flex-1 rounded-lg backdrop-blur-sm bg-background/80 border-border/50 shadow-lg min-h-[60px] max-h-[150px] resize-none focus:bg-background/90 focus:border-border transition-all duration-200"
            disabled={isSubmitting || isTransitioning.current}
            aria-label="Message input"
            spellCheck="true"
            rows={1}
          />
          <div className="flex items-center justify-end mt-2">
            <Button
              type="submit"
              disabled={!message.trim() || isSubmitting || isTransitioning.current}
              className="rounded-full bg-[#ea384c] hover:bg-[#dd3333] h-11 px-6 transition-all duration-200 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-[#ea384c]/20 sm:h-10 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {!isMobile && <span>Sending...</span>}
                </div>
              ) : isMobile ? (
                <Send className="h-4 w-4" />
              ) : (
                <>Send <Send className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
