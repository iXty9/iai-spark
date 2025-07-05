import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, MapPinOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
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
    requestLocation,
    getCurrentLocation,
    clearError
  } = useLocation();
  
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

    // Refresh current location
    const result = await getCurrentLocation();
    if (result.success) {
      toast({
        title: "Location updated",
        description: "Your current location has been refreshed."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Location update failed",
        description: result.error || "Failed to get your current location."
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
      return `Last updated: ${lastUpdated?.toLocaleString() || 'Unknown'}${
        currentLocation.address ? `\n${currentLocation.address}` : ''
      }`;
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