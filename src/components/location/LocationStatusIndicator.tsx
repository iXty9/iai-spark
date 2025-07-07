import React, { useState, useCallback, useRef } from 'react';
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
  const [isToggling, setIsToggling] = useState(false);
  const [localAutoUpdate, setLocalAutoUpdate] = useState<boolean | null>(null);
  const lastClickTime = useRef<number>(0);
  const { toast } = useToast();

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

    clearError();
    
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

    // Determine current state - use local state if available, otherwise fall back to profile
    const currentAutoUpdate = localAutoUpdate !== null 
      ? localAutoUpdate 
      : (profile?.location_auto_update !== false);
    const newAutoUpdate = !currentAutoUpdate;
    
    setIsToggling(true);
    
    // Optimistically update local state for immediate UI feedback
    setLocalAutoUpdate(newAutoUpdate);
    
    try {
      const result = await handleAutoUpdateToggle(newAutoUpdate);
      if (result.success) {
        toast({
          title: newAutoUpdate ? "Auto-updates enabled" : "Auto-updates disabled",
          description: newAutoUpdate 
            ? "Location will update automatically when you move"
            : "Location updates have been disabled"
        });
        
        // Clear local state after successful update - let profile state take over
        setTimeout(() => setLocalAutoUpdate(null), 1000);
      } else {
        // Revert optimistic update on failure
        setLocalAutoUpdate(currentAutoUpdate);
        throw new Error("Toggle operation failed");
      }
    } catch (error) {
      // Revert optimistic update on error
      setLocalAutoUpdate(currentAutoUpdate);
      toast({
        variant: "destructive",
        title: "Toggle failed",
        description: "Failed to toggle location auto-updates"
      });
    } finally {
      setIsToggling(false);
    }
  }, [isSupported, hasPermission, profile?.location_auto_update, localAutoUpdate, 
      isToggling, clearError, handleAutoUpdateToggle, toast]);

  const getStatusIcon = () => {
    if (isLoading || isToggling) {
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
    if (isLoading || isToggling) return isToggling ? 'Updating...' : 'Getting location...';
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
        // Use local state if available for immediate feedback, otherwise use profile state
        const currentState = localAutoUpdate !== null 
          ? localAutoUpdate 
          : (profile?.location_auto_update !== false);
        const autoUpdateStatus = currentState ? 'Auto-updates: ON' : 'Auto-updates: OFF';
        const addressInfo = currentLocation.address ? `\nAddress: ${currentLocation.address}` : '';
        const toggleText = isToggling ? '\n\nUpdating...' : '\n\nClick to toggle auto-updates';
        return `${autoUpdateStatus}\n${lastUpdate}${addressInfo}${toggleText}`;
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
              disabled={isLoading || isToggling}
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
            disabled={isLoading || isToggling}
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