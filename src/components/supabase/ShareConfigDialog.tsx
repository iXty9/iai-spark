
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
import { Share, Check, Copy } from 'lucide-react';

interface ShareConfigDialogProps {
  url: string;
  anonKey: string;
}

export function ShareConfigDialog({ url, anonKey }: ShareConfigDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
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
            Share this URL with your team to connect to the same Supabase project.
            The recipient will need to click this link to connect.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 mt-4">
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
        <div className="text-sm text-muted-foreground mt-2">
          <p>This link includes connection credentials and should only be shared with trusted team members.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
