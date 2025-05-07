
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Share, Check, Copy, Globe, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { saveSiteEnvironmentConfig } from '@/services/supabase/site-config-service';

interface ShareConfigDialogProps {
  url: string;
  anonKey: string;
}

export function ShareConfigDialog({ url, anonKey }: ShareConfigDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [savingSiteConfig, setSavingSiteConfig] = useState(false);
  const [siteConfigSaved, setSiteConfigSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("shareable-link");
  
  // Generate the shareable URL
  const generateShareableUrl = () => {
    const baseUrl = window.location.origin;
    const shareUrl = new URL(baseUrl);
    
    shareUrl.searchParams.set('public_url', url);
    shareUrl.searchParams.set('public_key', anonKey);
    
    return shareUrl.toString();
  };
  
  const shareableUrl = generateShareableUrl();
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      
      toast({
        title: "Link copied",
        description: "The shareable connection link has been copied to your clipboard."
      });
      
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  // Save configuration to site environment
  const handleSaveToSiteEnvironment = async () => {
    setSavingSiteConfig(true);
    try {
      const success = await saveSiteEnvironmentConfig(url, anonKey);
      
      if (success) {
        setSiteConfigSaved(true);
        toast({
          title: "Configuration saved",
          description: "The connection configuration has been saved to the site environment."
        });
        
        setTimeout(() => setSiteConfigSaved(false), 3000);
      } else {
        toast({
          title: "Save failed",
          description: "Could not save connection configuration to site environment.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "An error occurred while saving to site environment.",
        variant: "destructive"
      });
    } finally {
      setSavingSiteConfig(false);
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Share className="h-4 w-4 mr-1" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Connection</DialogTitle>
          <DialogDescription>
            Share this connection with your team or save it for automatic connection.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="shareable-link" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shareable-link">Shareable Link</TabsTrigger>
            <TabsTrigger value="site-config">Site Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="shareable-link" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Share this URL with your team to connect to the same Supabase project.</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Input
                className="flex-1 font-mono text-xs"
                value={shareableUrl}
                readOnly
              />
              <Button size="sm" onClick={copyToClipboard} className="shrink-0">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>The recipient will need to click this link to connect.</p>
              <p className="text-xs text-muted-foreground mt-2">This link includes connection credentials and should only be shared with trusted team members.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="site-config" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Save this connection to the site environment so new visitors can automatically connect without manual setup.</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
              <p><strong>Host:</strong> {window.location.hostname}</p>
              <p><strong>Supabase URL:</strong> <span className="font-mono text-xs">{url.split('//')[1]}</span></p>
              <p><strong>Connection Key:</strong> <span className="font-mono text-xs truncate inline-block max-w-[200px] align-bottom">...{anonKey.slice(-12)}</span></p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>This will save non-sensitive connection information to the database that will be used to automatically bootstrap new connections.</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground mt-2">
            Use these options to ensure your team can connect seamlessly.
          </div>
          
          <div className="flex justify-end space-x-2">
            {/* Active action button based on current tab */}
            <Button 
              size="sm"
              onClick={activeTab === "shareable-link" ? copyToClipboard : handleSaveToSiteEnvironment}
              disabled={activeTab === "site-config" && (savingSiteConfig || siteConfigSaved)}
            >
              {activeTab === "shareable-link" ? (
                copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </>
                )
              ) : (
                savingSiteConfig ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : siteConfigSaved ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Saved
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-1" />
                    Save to Site
                  </>
                )
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
