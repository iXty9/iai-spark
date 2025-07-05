
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TokenInfo } from '@/types/chat';
import { useIsMobile } from '@/hooks/use-mobile';
import { Activity, Hash, Zap, Calculator, Info, Trees, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { fetchAppSettings } from '@/services/admin/settingsService';

// Custom hook for counting animation
const useCountingAnimation = (target: number, duration: number = 2000, shouldAnimate: boolean = true) => {
  const [current, setCurrent] = React.useState(0);
  
  React.useEffect(() => {
    if (!shouldAnimate || target === 0) {
      setCurrent(target);
      return;
    }
    
    // Reset to 0 first
    setCurrent(0);
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (target - startValue) * easeOutCubic);
      
      setCurrent(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };
    
    // Small delay to ensure the dialog is visible before starting animation
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [target, duration, shouldAnimate]);
  
  return current;
};

interface TokenInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenInfo?: TokenInfo;
}

export const TokenInfoDialog: React.FC<TokenInfoDialogProps> = ({
  open,
  onOpenChange,
  tokenInfo,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [billingLink, setBillingLink] = React.useState<string>('');

  // Animated counters - only animate when dialog is open and tokenInfo exists
  const animatedPromptTokens = useCountingAnimation(tokenInfo?.promptTokens || 0, 2000, open && !!tokenInfo);
  const animatedCompletionTokens = useCountingAnimation(tokenInfo?.completionTokens || 0, 2000, open && !!tokenInfo);
  const animatedTotalTokens = useCountingAnimation(tokenInfo?.totalTokens || 0, 2000, open && !!tokenInfo);

  React.useEffect(() => {
    const checkAdminAndLoadSettings = async () => {
      if (user) {
        try {
          const adminStatus = await checkIsAdmin(user.id);
          setIsAdmin(adminStatus);
          
          // Load billing link from app settings
          const settings = await fetchAppSettings();
          setBillingLink(settings?.token_billing_url || '');
        } catch (error) {
          console.error('Failed to check admin status or load settings:', error);
        }
      }
    };

    if (open) {
      checkAdminAndLoadSettings();
    }
  }, [user, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        // Full width on mobile with padding, max width on desktop
        isMobile ? "w-[calc(100vw-1rem)] mx-2" : "w-full max-w-lg mx-4",
        "max-h-[85vh] overflow-y-auto",
        // Better centering - account for mobile keyboard and chat input
        isMobile 
          ? "fixed top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2" 
          : "fixed top-[calc(50%-40px)] left-1/2 -translate-x-1/2 -translate-y-1/2",
        // Improved mobile styling
        isMobile ? "px-4 py-6 rounded-2xl" : "px-6 py-6 rounded-lg",
        // Ensure proper z-index and backdrop
        "z-50 bg-background border shadow-2xl",
        // Fix close button positioning
        "[&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:hover:bg-muted [&>button]:transition-colors"
      )}>
        <DialogHeader className={cn(
          "pr-10", // Add right padding to account for close button
          isMobile ? "pb-4" : "pb-4"
        )}>
          <DialogTitle className={cn(
            "flex items-center gap-2 text-center justify-center",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <Activity className={cn(
              "text-[#dd3333] flex-shrink-0",
              isMobile ? "h-5 w-5" : "h-6 w-6"
            )} />
            Token Usage Information
          </DialogTitle>
        </DialogHeader>
        
        <div className={cn("space-y-4", isMobile ? "space-y-3" : "space-y-4")}>
          {tokenInfo ? (
            <div className="space-y-3">
              {/* Thread ID */}
              {tokenInfo.threadId && (
                <div className={cn(
                  "flex items-center justify-between p-3 bg-muted/50 rounded-lg border",
                  isMobile ? "flex-col space-y-2 text-center" : "flex-row"
                )}>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-[#dd3333]" />
                    <span className={cn("font-medium", isMobile ? "text-base" : "text-sm")}>
                      Thread ID
                    </span>
                  </div>
                  <span className={cn(
                    "text-muted-foreground font-mono break-all",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {tokenInfo.threadId}
                  </span>
                </div>
              )}
              
              {/* Token Statistics */}
              <div className="grid gap-3">
                {tokenInfo.promptTokens !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className={cn("font-medium text-blue-800 dark:text-blue-200", isMobile ? "text-base" : "text-sm")}>
                        Prompt Tokens
                      </span>
                    </div>
                     <span className={cn(
                       "font-bold text-blue-900 dark:text-blue-100",
                       isMobile ? "text-lg" : "text-base"
                     )}>
                       {animatedPromptTokens.toLocaleString()}
                     </span>
                  </div>
                )}
                
                {tokenInfo.completionTokens !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-purple-600" />
                      <span className={cn("font-medium text-purple-800 dark:text-purple-200", isMobile ? "text-base" : "text-sm")}>
                        Completion Tokens
                      </span>
                    </div>
                     <span className={cn(
                       "font-bold text-purple-900 dark:text-purple-100",
                       isMobile ? "text-lg" : "text-base"
                     )}>
                       {animatedCompletionTokens.toLocaleString()}
                     </span>
                  </div>
                )}
                
                {tokenInfo.totalTokens !== undefined && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#dd3333]/10 to-[#dd3333]/5 rounded-lg border border-[#dd3333]/20 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#dd3333]" />
                      <span className={cn("font-semibold text-[#dd3333]", isMobile ? "text-lg" : "text-base")}>
                        Total Tokens
                      </span>
                      {billingLink && (
                        <a
                          href={billingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[#dd3333] hover:text-[#cc2222] transition-colors"
                          title="View billing information"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                     <span className={cn(
                       "font-bold text-[#dd3333]",
                       isMobile ? "text-xl" : "text-lg"
                     )}>
                       {animatedTotalTokens.toLocaleString()}
                     </span>
                  </div>
                )}
                
                {/* Trees Planted */}
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center gap-2">
                    <Trees className="h-4 w-4 text-green-600" />
                    <span className={cn("font-medium text-green-800 dark:text-green-200", isMobile ? "text-base" : "text-sm")}>
                      Trees Planted
                    </span>
                  </div>
                  <span className={cn(
                    "font-bold text-green-900 dark:text-green-100",
                    isMobile ? "text-lg" : "text-base"
                  )}>
                    0
                  </span>
                </div>
              </div>
              
              {/* Info Note */}
              <div className={cn(
                "flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50",
                isMobile ? "text-sm" : "text-xs"
              )}>
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  Token usage reflects the computational cost of processing your message and generating the response.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className={cn("text-muted-foreground", isMobile ? "text-base" : "text-sm")}>
                No token information available for this message
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
