
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EnvironmentSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: any;
  onResetConfig: () => void;
  onReinitialize: () => void;
}

export function EnvironmentSettingsDialog({
  isOpen,
  onClose,
  connectionStatus,
  onResetConfig,
  onReinitialize
}: EnvironmentSettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Environment Settings</DialogTitle>
          <DialogDescription>
            Review and manage environment-specific configuration
          </DialogDescription>
        </DialogHeader>
        
        {connectionStatus && (
          <div className="space-y-4 my-2">
            <div className="border rounded-md p-4 bg-muted/20">
              <h4 className="font-medium mb-2">Connection Information</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Environment ID:</span> 
                  <span className="font-mono">{connectionStatus.environmentInfo?.environmentId}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Host:</span> 
                  <span className="font-mono">{connectionStatus.environmentInfo?.environment}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Connection ID:</span> 
                  <span className="font-mono">{connectionStatus.environmentInfo?.connectionId?.substring(0, 10)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Supabase URL:</span> 
                  <span className="font-mono text-xs truncate max-w-[220px]">{connectionStatus.environmentInfo?.url}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Last Connection:</span> 
                  <span>{new Date(connectionStatus.environmentInfo?.lastConnection).toLocaleString()}</span>
                </li>
              </ul>
            </div>
            
            <div className="border rounded-md p-4 bg-muted/20">
              <h4 className="font-medium mb-2">Connection Status</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Database Connection:</span>
                  <span className={connectionStatus.isConnected ? "text-green-500" : "text-red-500"}>
                    {connectionStatus.isConnected ? "Connected" : "Error"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Authentication:</span>
                  <span className={connectionStatus.isAuthenticated ? "text-green-500" : "text-red-500"}>
                    {connectionStatus.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Admin Privileges:</span>
                  <span className={connectionStatus.isAdmin ? "text-green-500" : "text-red-500"}>
                    {connectionStatus.isAdmin ? "Yes" : "No"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Edge Functions:</span>
                  <span className={connectionStatus.functionAvailable ? "text-green-500" : "text-red-500"}>
                    {connectionStatus.functionAvailable ? "Available" : "Not Available"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-0">
            <Button
              variant="destructive"
              onClick={onResetConfig}
            >
              Reset Configuration
            </Button>
            <Button onClick={onReinitialize}>
              Reinitialize Connection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
