import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, X, Globe, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationContext } from '@/contexts/LocationContext';
import { logger } from '@/utils/logging';

interface LocationWelcomePromptProps {
  onDismiss: () => void;
}

export const LocationWelcomePrompt: React.FC<LocationWelcomePromptProps> = ({ onDismiss }) => {
  const { profile } = useAuth();
  const { hasPermission, requestLocationPermission, isLoading } = useLocationContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show prompt if user hasn't been asked about location yet
    if (profile && !profile.location_permission_granted && !hasPermission) {
      const hasSeenPrompt = localStorage.getItem('location-prompt-dismissed');
      if (!hasSeenPrompt) {
        setIsVisible(true);
      }
    }
  }, [profile, hasPermission]);

  const handleAllow = async () => {
    try {
      await requestLocationPermission();
      logger.info('Location permission requested from welcome prompt', { module: 'location-welcome' });
      setIsVisible(false);
      onDismiss();
    } catch (error) {
      logger.error('Failed to request location permission from welcome prompt:', error, { module: 'location-welcome' });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('location-prompt-dismissed', 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-primary/20 z-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Enable Location Services</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-sm">
          Get personalized, location-aware assistance from Ixty AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <span>Context-aware responses</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Smart automatic updates</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span>Secure & private</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            Not Now
          </Button>
          <Button
            size="sm"
            onClick={handleAllow}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
                Enabling...
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3 mr-1" />
                Allow Access
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};