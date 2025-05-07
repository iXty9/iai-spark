
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Share, Check, Copy, Users, Globe, LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ShareConfigDialogProps {
  url: string;
  anonKey: string;
}

export function ShareConfigDialog({ url, anonKey }: ShareConfigDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Generate the shareable URL
  const generateShareableUrl = () => {
    const baseUrl = window.location.origin;
    const shareUrl = new URL(baseUrl);
    
    // Add public URL and key as query parameters
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
  
  // Generate QR code URL using a free service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareableUrl)}`;
  
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
            Share this connection with your team to connect to the same Supabase project.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4 mr-1" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="qr">
              <Globe className="h-4 w-4 mr-1" />
              QR Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 mt-4">
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
            
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Share this link with your team members to allow them to connect to the same Supabase project.
              </p>
              <p className="text-muted-foreground">
                The recipient will see a success message after connecting.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="flex justify-center">
              {showQRCode ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for connection sharing" 
                  className="h-48 w-48"
                  onLoad={() => setShowQRCode(true)}
                  onError={() => {
                    toast({
                      title: "QR Code Error",
                      description: "Could not generate QR code. Please use the share link instead.",
                      variant: "destructive"
                    });
                    setActiveTab('link');
                  }}
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center bg-muted rounded-md">
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowQRCode(true)}
                  >
                    Generate QR Code
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-sm space-y-1 text-center">
              <p className="text-muted-foreground">
                Scan this QR code with your device's camera to connect to the same Supabase project.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <Alert variant="warning" className="mt-4">
          <AlertTitle className="text-amber-800 text-sm font-medium">Security Notice</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            This link includes connection credentials and should only be shared with trusted team members.
            It will expire after use or in 24 hours.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
