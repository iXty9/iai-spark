
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Copy, Check, Share2 } from 'lucide-react';
import { ThemeSettings } from '@/types/theme';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ThemeImportExportProps {
  theme: 'light' | 'dark';
  lightTheme: any;
  darkTheme: any;
  backgroundImage: string | null;
  backgroundOpacity: number;
  onImportTheme: (themeSettings: ThemeSettings) => void;
}

export function ThemeImportExport({
  theme,
  lightTheme,
  darkTheme,
  backgroundImage,
  backgroundOpacity,
  onImportTheme
}: ThemeImportExportProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  
  // Create theme settings object for export
  const themeSettings: ThemeSettings = {
    mode: theme,
    lightTheme,
    darkTheme,
    backgroundImage,
    backgroundOpacity: backgroundOpacity.toString()
  };
  
  // Format theme JSON for export
  const themeJson = JSON.stringify(themeSettings, null, 2);
  
  // Handle theme export
  const handleExportTheme = () => {
    // Create a blob with the theme data
    const blob = new Blob([themeJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-settings-${Date.now()}.json`;
    
    // Trigger download and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Theme exported",
      description: "Theme settings exported successfully",
    });
  };
  
  // Handle copy to clipboard
  const handleCopyTheme = async () => {
    try {
      await navigator.clipboard.writeText(themeJson);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Theme settings copied to clipboard",
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy settings. Try exporting instead.",
      });
    }
  };
  
  // Handle theme import from JSON
  const handleImport = () => {
    try {
      // Reset error state
      setImportError('');
      
      // Parse the JSON data
      const importedSettings = JSON.parse(importData);
      
      // Validate required fields
      if (!importedSettings.lightTheme || !importedSettings.darkTheme) {
        setImportError('Invalid theme format: Missing required theme data');
        return;
      }
      
      // Validate mode
      if (importedSettings.mode && !['light', 'dark'].includes(importedSettings.mode)) {
        setImportError('Invalid theme mode: Must be "light" or "dark"');
        return;
      }
      
      // Apply the imported theme
      onImportTheme(importedSettings);
      
      // Close dialog and show success message
      setShowImportDialog(false);
      setImportData('');
      
      toast({
        title: "Theme imported",
        description: "Theme settings imported successfully",
      });
    } catch (err) {
      // Handle JSON parse error
      setImportError('Invalid JSON format. Please check your theme data.');
    }
  };
  
  return (
    <>
      <div className="space-y-4 border rounded-md p-4">
        <h3 className="font-medium mb-2">Export & Import Theme</h3>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportTheme}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Theme
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCopyTheme}
            className="flex-1"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy as JSON
          </Button>
        </div>
        
        <Button
          variant="secondary"
          onClick={() => setShowImportDialog(true)}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Theme
        </Button>
      </div>
      
      {/* Import Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Paste your theme JSON data below. This will replace your current theme settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <Label htmlFor="import-data">Theme Data (JSON)</Label>
            <Input
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="h-32"
              placeholder='{"mode":"light","lightTheme":{...},"darkTheme":{...}}'
              as="textarea"
            />
            
            {importError && (
              <p className="text-sm text-red-500 mt-1">{importError}</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
