import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, RefreshCw, Shield, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationContext } from '@/contexts/LocationContext';
import { useToast } from '@/hooks/use-toast';

export const LocationSettings: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { 
    isSupported, 
    hasPermission, 
    isLoading, 
    currentLocation, 
    error, 
    lastUpdated,
    requestLocationPermission,
    refreshLocation,
    handleAutoUpdateToggle: locationContextToggle
  } = useLocationContext();
  const { toast } = useToast();

  const handlePermissionToggle = async () => {
    if (hasPermission) {
      // Cannot revoke permission programmatically - show info
      toast({
        title: "Location Permission",
        description: "To disable location access, please change permissions in your browser settings.",
      });
    } else {
      try {
        await requestLocationPermission();
        toast({
          title: "Location Enabled",
          description: "Location services have been enabled successfully.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Location access was denied. Please enable it in your browser settings.",
        });
      }
    }
  };

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    try {
      await locationContextToggle(enabled);
      
      if (updateProfile) {
        await updateProfile({ location_auto_update: enabled });
      }
      
      toast({
        title: enabled ? "Auto-update Enabled" : "Auto-update Disabled",
        description: enabled 
          ? "Your location will be updated automatically when you move."
          : "Your location will only update when manually refreshed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update location preferences.",
      });
    }
  };

  const handleRefreshLocation = async () => {
    const result = await refreshLocation();
    
    if (result.success) {
      toast({
        title: "Location Updated",
        description: "Your current location has been refreshed.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: result.error || "Failed to refresh location.",
      });
    }
  };

  const getLocationDisplay = () => {
    if (!currentLocation) return "No location data";
    
    if (currentLocation.city && currentLocation.country) {
      return `${currentLocation.city}, ${currentLocation.country}`;
    }
    
    return `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Location services are not supported in your browser.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Location Access</p>
                <p className="text-sm text-muted-foreground">
                  Allow location access for personalized assistance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={hasPermission ? "default" : "secondary"}>
                  {hasPermission ? "Enabled" : "Disabled"}
                </Badge>
                <Button
                  variant={hasPermission ? "outline" : "default"}
                  size="sm"
                  onClick={handlePermissionToggle}
                  disabled={isLoading}
                >
                  {hasPermission ? "Manage" : "Enable"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Current Location */}
          {hasPermission && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Current Location</p>
                  <p className="text-sm text-muted-foreground">
                    {getLocationDisplay()}
                  </p>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastUpdated.toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshLocation}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Auto-update Settings */}
          {hasPermission && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Automatic Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically update location when you move significantly
                  </p>
                </div>
                <Switch
                  checked={profile?.location_auto_update ?? true}
                  onCheckedChange={handleAutoUpdateToggle}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Your location data is stored securely and used only to improve your AI experience.</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Location is updated smartly - only when you move significantly (&gt;100m) or after 30 minutes.</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>You can disable location services at any time through your browser settings.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};