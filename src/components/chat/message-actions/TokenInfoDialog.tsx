
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TokenInfo } from '@/types/chat';
import { useIsMobile } from '@/hooks/use-mobile';
import { Activity, Hash, Zap, Calculator, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "w-[calc(100vw-1rem)] max-w-lg",
        "max-h-[90vh] overflow-y-auto",
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
        isMobile ? "px-4 py-5" : "px-6 py-6"
      )}>
        <DialogHeader className={isMobile ? "pb-3" : "pb-4"}>
          <DialogTitle className={cn(
            "flex items-center gap-2 text-center justify-center",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <Activity className={cn(
              "text-[#dd3333]",
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
                      {tokenInfo.promptTokens.toLocaleString()}
                    </span>
                  </div>
                )}
                
                {tokenInfo.completionTokens !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-green-600" />
                      <span className={cn("font-medium text-green-800 dark:text-green-200", isMobile ? "text-base" : "text-sm")}>
                        Completion Tokens
                      </span>
                    </div>
                    <span className={cn(
                      "font-bold text-green-900 dark:text-green-100",
                      isMobile ? "text-lg" : "text-base"
                    )}>
                      {tokenInfo.completionTokens.toLocaleString()}
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
                    </div>
                    <span className={cn(
                      "font-bold text-[#dd3333]",
                      isMobile ? "text-xl" : "text-lg"
                    )}>
                      {tokenInfo.totalTokens.toLocaleString()}
                    </span>
                  </div>
                )}
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
