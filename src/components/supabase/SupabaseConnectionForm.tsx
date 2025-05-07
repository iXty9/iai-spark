
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testSupabaseConnection } from '@/services/supabase/connection-service';
import { Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveConnectionConfig } from '@/services/admin/settingsService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SupabaseConnectionFormProps {
  onSuccess: (url: string, anonKey: string) => void;
}

export function SupabaseConnectionForm({ onSuccess }: SupabaseConnectionFormProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [showShareOption, setShowShareOption] = useState(false);
  
  // Form validation
  const isValid = url.trim() !== '' && anonKey.trim() !== '';
  
  // Handle the test connection button
  const handleTestConnection = async () => {
    if (!isValid) return;
    
    setIsTesting(true);
    setError(null);
    
    try {
      const connectionValid = await testSupabaseConnection(url, anonKey);
      
      if (connectionValid) {
        // First save config to localStorage via the onSuccess callback
        onSuccess(url, anonKey);
        
        // Then try to save to database (this will only work if we have established a connection)
        setIsSavingToDb(true);
        
        try {
          const dbSaved = await saveConnectionConfig(url, anonKey);
          
          if (dbSaved) {
            toast({
              title: "Configuration saved",
              description: "Your connection settings have been saved to the database and will be available across all browsers.",
            });
            
            // Show share option after successful save
            setShowShareOption(true);
          } else {
            toast({
              title: "Warning",
              description: "Connected successfully, but couldn't save configuration to database for persistence. Settings will only be available in this browser.",
              variant: "default"
            });
          }
        } catch (err) {
          // Don't block the user flow if this fails - they'll have localStorage config which should work fine
          console.error("Failed to save connection config to database:", err);
        } finally {
          setIsSavingToDb(false);
        }
        
        toast({
          title: "Connection successful",
          description: "Successfully connected to Supabase.",
        });
      } else {
        setError('Could not connect to Supabase with the provided credentials. Please check your URL and keys.');
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Supabase URL</Label>
        <Input 
          id="url" 
          placeholder="https://your-project.supabase.co" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Find this in your Supabase project settings under API.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="anon-key">Anon/Public Key</Label>
        <Input 
          id="anon-key" 
          placeholder="your-anon-key" 
          value={anonKey}
          onChange={(e) => setAnonKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          This is your project's anon/public API key.
        </p>
      </div>
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {showShareOption && (
        <Alert className="bg-primary/5 border-primary/20">
          <Share2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            You can now share this connection with others using the "Share" button in your settings.
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleTestConnection} 
        disabled={!isValid || isTesting || isSavingToDb} 
        className="w-full mt-2"
      >
        {isTesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Connection...
          </>
        ) : isSavingToDb ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Configuration...
          </>
        ) : (
          'Connect to Supabase'
        )}
      </Button>
    </div>
  );
}
