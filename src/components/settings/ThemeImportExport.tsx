import React, { useState, useCallback, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Share, Download, Upload, AlertCircle } from 'lucide-react';
import { ThemeSettings } from '@/types/theme';

interface ThemeImportExportProps {
  theme: ThemeSettings;
  onImport: (theme: ThemeSettings) => void;
}

export function ThemeImportExport({ theme, onImport }: ThemeImportExportProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [themeJson, setThemeJson] = useState('');
  const [themeName, setThemeName] = useState('');
  const [themeUrl, setThemeUrl] = useState('');
  const [importMethod, setImportMethod] = useState<'json' | 'url'>('json');
  const [importError, setImportError] = useState<string | null>(null);
  const { toast } = useToast();

  // Export current theme as JSON
  const handleExport = useCallback(() => {
    try {
      const themeToExport = {
        ...theme,
        name: themeName || 'My Custom Theme',
        exportDate: new Date().toISOString(),
      };
      
      setThemeJson(JSON.stringify(themeToExport, null, 2));
      setExportOpen(true);
    } catch (error) {
      console.error('Error exporting theme:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your theme.",
        variant: "destructive"
      });
    }
  }, [theme, themeName, toast]);

  // Copy the JSON to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(themeJson)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Theme JSON copied to clipboard.",
        });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: "Copy Failed",
          description: "Could not copy to clipboard. Please try manually selecting the text.",
          variant: "destructive"
        });
      });
  }, [themeJson, toast]);

  // Create a shareable URL with theme data
  const handleCreateShareUrl = useCallback(() => {
    try {
      const minifiedTheme = {
        // Include only essential theme properties to keep URL short
        colors: theme.colors,
        backgroundConfig: theme.backgroundConfig
      };
      
      const encoded = encodeURIComponent(btoa(JSON.stringify(minifiedTheme)));
      const url = `${window.location.origin}/settings?theme=${encoded}`;
      setThemeUrl(url);
      
      navigator.clipboard.writeText(url)
        .then(() => {
          toast({
            title: "URL Created and Copied!",
            description: "Shareable theme URL has been copied to your clipboard.",
          });
        })
        .catch(err => {
          console.error('Failed to copy URL:', err);
          toast({
            title: "URL Created",
            description: "Copy the URL from the field below.",
          });
        });
    } catch (error) {
      console.error('Error creating share URL:', error);
      toast({
        title: "Error",
        description: "Failed to create shareable URL.",
        variant: "destructive"
      });
    }
  }, [theme, toast]);

  // Download theme as JSON file
  const handleDownload = useCallback(() => {
    try {
      const dataStr = JSON.stringify({
        ...theme,
        name: themeName || 'My Custom Theme',
        exportDate: new Date().toISOString(),
      }, null, 2);
      
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileName = `${themeName || 'theme'}-${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      linkElement.remove();
      
      toast({
        title: "Theme Downloaded",
        description: `Saved as ${exportFileName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your theme.",
        variant: "destructive"
      });
    }
  }, [theme, themeName, toast]);

  // Import theme from JSON
  const handleImport = useCallback(() => {
    setImportError(null);
    
    try {
      if (importMethod === 'json') {
        if (!themeJson.trim()) {
          setImportError("Please enter theme JSON data");
          return;
        }
        
        const imported = JSON.parse(themeJson);
        
        // Basic validation
        if (!imported.colors) {
          setImportError("Invalid theme format: missing colors");
          return;
        }
        
        onImport(imported);
        setImportOpen(false);
        toast({
          title: "Theme Imported",
          description: `Successfully imported ${imported.name || 'theme'}.`,
        });
      } else if (importMethod === 'url') {
        if (!themeUrl.trim()) {
          setImportError("Please enter a theme URL");
          return;
        }
        
        try {
          const url = new URL(themeUrl);
          const themeParam = url.searchParams.get('theme');
          
          if (!themeParam) {
            setImportError("Invalid theme URL: no theme data found");
            return;
          }
          
          const decoded = JSON.parse(atob(decodeURIComponent(themeParam)));
          
          // Basic validation
          if (!decoded.colors) {
            setImportError("Invalid theme format in URL: missing colors");
            return;
          }
          
          onImport(decoded);
          setImportOpen(false);
          toast({
            title: "Theme Imported",
            description: "Successfully imported theme from URL.",
          });
        } catch (error) {
          console.error('URL parsing error:', error);
          setImportError("Invalid theme URL: could not parse theme data");
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError("Could not parse theme JSON. Please check the format.");
    }
  }, [themeJson, themeUrl, importMethod, onImport, toast]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Theme Import & Export</CardTitle>
        <CardDescription>Share your theme or import themes from others</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="theme-name">Theme Name</Label>
          <Input
            id="theme-name"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="mt-1"
            placeholder="My Awesome Theme"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={handleExport} variant="outline">
          <Share className="mr-2 h-4 w-4" />
          Export Theme
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Theme
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Theme</DialogTitle>
              <DialogDescription>
                Paste theme JSON or enter a theme URL
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant={importMethod === 'json' ? "default" : "outline"}
                  onClick={() => setImportMethod('json')}
                  size="sm"
                >
                  JSON
                </Button>
                <Button
                  variant={importMethod === 'url' ? "default" : "outline"}
                  onClick={() => setImportMethod('url')}
                  size="sm"
                >
                  URL
                </Button>
              </div>
              
              {importMethod === 'json' ? (
                <div>
                  <Label htmlFor="theme-json" className="sr-only">
                    Theme JSON
                  </Label>
                  <Textarea
                    id="theme-json"
                    value={themeJson}
                    onChange={(e) => setThemeJson(e.target.value)}
                    placeholder='{"colors":{"light":{"primary":"..."},"dark":{...}},"backgroundConfig":{...}}'
                    rows={8}
                    className="font-mono text-xs resize-none"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="theme-url" className="sr-only">
                    Theme URL
                  </Label>
                  <Input
                    id="theme-url"
                    value={themeUrl}
                    onChange={(e) => setThemeUrl(e.target.value)}
                    placeholder="https://example.com/settings?theme=..."
                    className="w-full"
                  />
                </div>
              )}
              
              {importError && (
                <div className="text-destructive flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {importError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button">Import</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Import theme?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace your current theme settings. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImport}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
      
      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Theme</DialogTitle>
            <DialogDescription>
              Copy the JSON below or create a shareable URL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={themeJson}
              className="font-mono text-xs resize-none"
              rows={8}
              readOnly
            />
            <Input
              value={themeUrl}
              className="w-full"
              placeholder="Generate a shareable URL..."
              readOnly
            />
          </div>
          <DialogFooter className="flex flex-wrap justify-end gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={handleCreateShareUrl}>
              <Share className="mr-2 h-4 w-4" />
              Create Shareable URL
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleCopy}>
                Copy JSON
              </Button>
              <Button type="button" onClick={() => setExportOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
