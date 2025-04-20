
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TokenInfo } from '@/types/chat';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Token Usage Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {tokenInfo ? (
            <>
              {tokenInfo.threadId && (
                <p className="flex justify-between">
                  <span className="font-medium">Thread ID:</span>
                  <span className="text-muted-foreground">{tokenInfo.threadId}</span>
                </p>
              )}
              {tokenInfo.promptTokens !== undefined && (
                <p className="flex justify-between">
                  <span className="font-medium">Prompt Tokens:</span>
                  <span className="text-muted-foreground">{tokenInfo.promptTokens}</span>
                </p>
              )}
              {tokenInfo.completionTokens !== undefined && (
                <p className="flex justify-between">
                  <span className="font-medium">Completion Tokens:</span>
                  <span className="text-muted-foreground">{tokenInfo.completionTokens}</span>
                </p>
              )}
              {tokenInfo.totalTokens !== undefined && (
                <p className="flex justify-between">
                  <span className="font-medium">Total Tokens:</span>
                  <span className="text-muted-foreground">{tokenInfo.totalTokens}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No token information available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
