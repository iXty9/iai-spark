import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, MapPinOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { useLocationContext } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDevMode } from '@/store/use-dev-mode';
import { LocationPermissionDialog } from './LocationPermissionDialog';
import { useToast } from '@/hooks/use-toast';

interface LocationStatusIndicatorProps {
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}

export const LocationStatusIndicator: React.FC<LocationStatusIndicatorProps> = ({ 
  showLabel = false,
  variant = 'default' 
}) => {
  const { 
    isSupported, 
    hasPermission, 
    isLoading, 
    currentLocation, 
    error, 
    lastUpdated,
    clearError
  } = useLocation();
  
  const { handleAutoUpdateToggle } = useLocationContext();
  const { profile } = useAuth();
  const { isDevMode } = useDevMode();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const { toast } = useToast();

  const handleLocationClick = async () => {
    clearError();
    
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Location not supported",
        description: "Your browser doesn't support location services."
      });
      return;
    }

    if (!hasPermission) {
      setShowPermissionDialog(true);
      return;
    }

    // Toggle auto-update setting
    const currentAutoUpdate = profile?.location_auto_update !== false;
    const newAutoUpdate = !currentAutoUpdate;
    
    try {
      const result = await handleAutoUpdateToggle(newAutoUpdate);
      if (result.success) {
        toast({
          title: newAutoUpdate ? "Auto-updates enabled" : "Auto-updates disabled",
          description: newAutoUpdate 
            ? "Location will update automatically when you move"
            : "Location updates have been disabled"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Toggle failed",
        description: "Failed to toggle location auto-updates"
      });
    }
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (hasPermission && currentLocation) {
      return <MapPin className="h-4 w-4" />;
    }
    return <MapPinOff className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not supported';
    if (isLoading) return 'Getting location...';
    if (error) return 'Location error';
    if (hasPermission && currentLocation) {
      if (currentLocation.city) {
        return `${currentLocation.city}${currentLocation.country ? `, ${currentLocation.country}` : ''}`;
      }
      return `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
    }
    return 'Location disabled';
  };

  const getStatusVariant = () => {
    if (error) return 'destructive' as const;
    if (hasPermission && currentLocation) return 'default' as const;
    return 'secondary' as const;
  };

  const getTooltipText = () => {
    if (!isSupported) return 'Location services are not supported in your browser';
    if (error) return `Location error: ${error}`;
    if (hasPermission && currentLocation) {
      const lastUpdate = `Last updated: ${lastUpdated?.toLocaleString() || 'Unknown'}`;
      
      if (isDevMode) {
        const autoUpdateStatus = profile?.location_auto_update !== false ? 'Auto-updates: ON' : 'Auto-updates: OFF';
        const addressInfo = currentLocation.address ? `\nAddress: ${currentLocation.address}` : '';
        return `${autoUpdateStatus}\n${lastUpdate}${addressInfo}\n\nClick to toggle auto-updates`;
      }
      
      return lastUpdate;
    }
    return 'Click to enable location services';
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLocationClick}
              disabled={isLoading}
              className="h-8 w-8"
            >
              {getStatusIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="whitespace-pre-line">{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
        <LocationPermissionDialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocationClick}
            disabled={isLoading}
            className="h-auto p-2 flex items-center gap-2"
          >
            {getStatusIcon()}
            {showLabel && (
              <Badge variant={getStatusVariant()} className="text-xs">
                {getStatusText()}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
      <LocationPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
      />
    </TooltipProvider>
  );
};