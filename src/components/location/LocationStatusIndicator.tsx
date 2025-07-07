import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, MapPinOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useEnhancedLocation } from '@/hooks/location/use-enhanced-location';
import { useLocationContext } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDevMode } from '@/store/use-dev-mode';
import { LocationPermissionDialog } from './LocationPermissionDialog';
import { supaToast } from '@/services/supa-toast';

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
  } = useEnhancedLocation();
  
  const { handleAutoUpdateToggle } = useLocationContext();
  const { profile } = useAuth();
  const { isDevMode } = useDevMode();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const lastClickTime = useRef<number>(0);
  

  // Simplified click handler with better debouncing
  const handleLocationClick = useCallback(async () => {
    // Rate limiting: prevent clicks within 1 second
    const now = Date.now();
    if (now - lastClickTime.current < 1000) {
      return;
    }
    lastClickTime.current = now;

    // Prevent multiple concurrent operations
    if (isOperating || isLoading) {
      return;
    }

    clearError();
    
    if (!isSupported) {
      supaToast.error("Your browser doesn't support location services.", {
        title: "Location not supported"
      });
      return;
    }

    // Check if user is authenticated
    if (!profile) {
      supaToast.error("Please sign in to use location services.", {
        title: "Authentication required"
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
    
    setIsOperating(true);
    
    try {
      const result = await handleAutoUpdateToggle(newAutoUpdate);
      if (result.success) {
        supaToast.success(newAutoUpdate 
          ? "Location will update automatically when you move"
          : "Location updates have been disabled", {
          title: newAutoUpdate ? "Auto-updates enabled" : "Auto-updates disabled"
        });
      } else {
        supaToast.error(result.error || "Failed to toggle location auto-updates", {
          title: "Toggle failed"
        });
      }
    } catch (error) {
      supaToast.error("Failed to toggle location auto-updates", {
        title: "Toggle failed"
      });
    } finally {
      setIsOperating(false);
    }
  }, [isSupported, hasPermission, profile?.location_auto_update, 
      isOperating, isLoading, clearError, handleAutoUpdateToggle]);

  const getStatusIcon = () => {
    if (isLoading || isOperating) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (hasPermission) {
      // Show different icon based on auto-update setting when permission is granted
      const autoUpdateEnabled = profile?.location_auto_update !== false;
      return autoUpdateEnabled ? <MapPin className="h-4 w-4" /> : <MapPinOff className="h-4 w-4" />;
    }
    return <MapPinOff className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not supported';
    if (isLoading || isOperating) return isOperating ? 'Updating...' : 'Getting location...';
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
    if (hasPermission) {
      const autoUpdateEnabled = profile?.location_auto_update !== false;
      return autoUpdateEnabled ? 'default' as const : 'secondary' as const;
    }
    return 'secondary' as const;
  };

  const getTooltipText = () => {
    if (!isSupported) return 'Location services are not supported in your browser';
    if (error) return `Location error: ${error}`;
    if (hasPermission && currentLocation) {
      const lastUpdate = `Last updated: ${lastUpdated?.toLocaleString() || 'Unknown'}`;
      
      if (isDevMode) {
        const currentState = profile?.location_auto_update !== false;
        const autoUpdateStatus = currentState ? 'Auto-updates: ON' : 'Auto-updates: OFF';
        const addressInfo = currentLocation.address ? `\nAddress: ${currentLocation.address}` : '';
        const toggleText = isOperating ? '\n\nUpdating...' : '\n\nClick to toggle auto-updates';
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
              disabled={isLoading || isOperating}
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
            disabled={isLoading || isOperating}
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