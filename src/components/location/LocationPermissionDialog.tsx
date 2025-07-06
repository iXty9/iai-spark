import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Shield, Clock, Globe } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/contexts/AuthContext';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionGranted?: () => void;
}

export const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  open,
  onOpenChange,
  onPermissionGranted
}) => {
  const { requestLocation, isLoading } = useLocation();
  const { user } = useAuth();

  const handleRequestPermission = async () => {
    if (!user) {
      onOpenChange(false);
      return;
    }
    
    const result = await requestLocation();
    if (result.success) {
      onPermissionGranted?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Enable Location Services
          </DialogTitle>
        </DialogHeader>
        <div className="text-left space-y-3 pb-4">
          <p className="text-sm text-muted-foreground">
            Allow Ixty AI to access your location to provide better, more personalized assistance.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Globe className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Get location-aware responses and recommendations</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Automatic smart updates when you move significantly</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Your location is stored securely and privately</span>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Not Now
          </Button>
          <Button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Getting Location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Allow Location Access
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};