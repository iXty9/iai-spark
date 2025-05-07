
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testSupabaseConnection } from '@/services/supabase/connection-service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupabaseConnectionFormProps {
  onSuccess: (url: string, anonKey: string) => void;
}

export function SupabaseConnectionForm({ onSuccess }: SupabaseConnectionFormProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
        toast({
          title: "Connection successful",
          description: "Successfully connected to Supabase.",
        });
        onSuccess(url, anonKey);
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
      
      <Button 
        onClick={handleTestConnection} 
        disabled={!isValid || isTesting} 
        className="w-full mt-2"
      >
        {isTesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Connection...
          </>
        ) : (
          'Connect to Supabase'
        )}
      </Button>
    </div>
  );
}
