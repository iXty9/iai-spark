import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { useState } from 'react';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
  const { promptInstall } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted || onDismiss) {
        onDismiss?.();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Install Ixty AI</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Get quick access to Ixty AI from your desktop or home screen
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isInstalling ? 'Installing...' : 'Install App'}
          </Button>
          <div className="text-sm text-muted-foreground">
            • Works offline • Fast access • Native experience
          </div>
        </div>
      </CardContent>
    </Card>
  );
};