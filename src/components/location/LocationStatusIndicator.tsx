import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, MapPinOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useLocationContext } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
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
    handleAutoUpdateToggle,
  } = useLocationContext();
  const { profile } = useAuth();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [localAutoUpdate, setLocalAutoUpdate] = useState<boolean | null>(null);
  const lastClickTime = useRef<number>(0);
  const { toast } = useToast();

  // Unified auto-update state - use local optimistic state if available, otherwise profile
  const isAutoUpdateEnabled = useMemo(() => {
    if (localAutoUpdate !== null) return localAutoUpdate;
    return profile?.location_auto_update !== false;
  }, [localAutoUpdate, profile?.location_auto_update]);

  // Debounced click handler with rate limiting
  const handleLocationClick = useCallback(async () => {
    // Rate limiting: prevent clicks within 500ms
    const now = Date.now();
    if (now - lastClickTime.current < 500) {
      return;
    }
    lastClickTime.current = now;

    // Prevent multiple concurrent operations
    if (isToggling) {
      return;
    }
    
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Location not supported",
        description: "Your browser doesn't support location services."
      });
      return;
    }

    // Check if user is authenticated
    if (!profile) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to use location services."
      });
      return;
    }

    if (!hasPermission) {
      setShowPermissionDialog(true);
      return;
    }

    const newAutoUpdate = !isAutoUpdateEnabled;
    
    setIsToggling(true);
    
    // Optimistically update local state for immediate UI feedback
    setLocalAutoUpdate(newAutoUpdate);
    
    try {
      const result = await handleAutoUpdateToggle(newAutoUpdate);
      if (result.success) {
        toast({
          title: newAutoUpdate ? "Location updates enabled" : "Location updates paused",
          description: newAutoUpdate 
            ? "Location will update automatically when you move"
            : "Location updates have been paused"
        });
        
        // Keep local state for a short period to avoid flicker, then let profile take over
        setTimeout(() => setLocalAutoUpdate(null), 2000);
      } else {
        // Revert optimistic update on failure
        setLocalAutoUpdate(isAutoUpdateEnabled);
        throw new Error("Toggle operation failed");
      }
    } catch (error) {
      // Revert optimistic update on error
      setLocalAutoUpdate(isAutoUpdateEnabled);
      toast({
        variant: "destructive",
        title: "Toggle failed",
        description: "Failed to toggle location updates"
      });
    } finally {
      setIsToggling(false);
    }
  }, [isSupported, hasPermission, profile, isAutoUpdateEnabled, isToggling, handleAutoUpdateToggle, toast]);

  const getStatusIcon = () => {
    if (isLoading || isToggling) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (!hasPermission || !currentLocation) {
      return <MapPinOff className="h-4 w-4" />;
    }
    // Has permission and location - show based on auto-update state
    if (isAutoUpdateEnabled) {
      return <MapPin className="h-4 w-4" />;
    }
    return <MapPinOff className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not supported';
    if (isLoading || isToggling) return isToggling ? 'Updating...' : 'Getting location...';
    if (error) return 'Location error';
    if (!hasPermission) return 'Location disabled';
    if (!currentLocation) return 'No location';
    
    // Has permission and location
    if (!isAutoUpdateEnabled) {
      return 'Updates paused';
    }
    
    if (currentLocation.city) {
      return `${currentLocation.city}${currentLocation.country ? `, ${currentLocation.country}` : ''}`;
    }
    return `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
  };

  const getStatusVariant = () => {
    if (error) return 'destructive' as const;
    if (hasPermission && currentLocation && isAutoUpdateEnabled) return 'default' as const;
    return 'secondary' as const;
  };

  const getTooltipText = () => {
    if (!isSupported) return 'Location services are not supported in your browser';
    if (error) return `Location error: ${error}`;
    if (!hasPermission) return 'Click to enable location services';
    if (!currentLocation) return 'Location not available';
    
    // Has permission and location - show status based on auto-update
    if (!isAutoUpdateEnabled) {
      const locationInfo = currentLocation.city 
        ? `${currentLocation.city}${currentLocation.country ? `, ${currentLocation.country}` : ''}`
        : `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
      return `Location updates paused\n${locationInfo}\n\nClick to enable updates`;
    }
    
    const lastUpdate = lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : '';
    const locationInfo = currentLocation.city 
      ? `${currentLocation.city}${currentLocation.country ? `, ${currentLocation.country}` : ''}`
      : `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
    
    return `Location updates active\n${locationInfo}\n${lastUpdate}\n\nClick to pause updates`;
  };

  const getButtonClassName = () => {
    const baseClass = variant === 'compact' ? 'h-8 w-8' : 'h-auto p-2 flex items-center gap-2';
    
    // Add visual indication for disabled state
    if (hasPermission && currentLocation && !isAutoUpdateEnabled) {
      return `${baseClass} opacity-60`;
    }
    return baseClass;
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
              disabled={isLoading || isToggling}
              className={getButtonClassName()}
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
            disabled={isLoading || isToggling}
            className={getButtonClassName()}
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
