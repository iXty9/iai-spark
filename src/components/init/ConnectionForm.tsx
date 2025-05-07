
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { testSupabaseConnection } from '@/services/supabase/connection-service';
import { Loader2 } from 'lucide-react';
import { saveConnectionConfig } from '@/services/admin/settingsService';

interface ConnectionFormProps {
  onSuccess: (url: string, anonKey: string, serviceKey: string) => void;
}

export function ConnectionForm({ onSuccess }: ConnectionFormProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  
  // Form validation
  const isValid = url.trim() !== '' && 
                  anonKey.trim() !== '' && 
                  serviceKey.trim() !== '';
  
  // Handle the test connection button
  const handleTestConnection = async () => {
    if (!isValid) return;
    
    setIsTesting(true);
    setError(null);
    
    try {
      const connectionValid = await testSupabaseConnection(url, anonKey);
      
      if (connectionValid) {
        // First call the onSuccess callback to handle localStorage storage
        onSuccess(url, anonKey, serviceKey);
        
        // Then try to save to database
        setIsSavingToDb(true);
        try {
          // Save the config to the database, including the service key
          // During initialization, we can save the service key as it's needed for setup
          await saveConnectionConfig(url, anonKey, serviceKey);
        } catch (err) {
          console.error("Failed to save connection config to database during initialization:", err);
          // Continue with initialization even if database save fails
        } finally {
          setIsSavingToDb(false);
        }
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
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Connect to Supabase</CardTitle>
        <CardDescription>
          Enter your Supabase project details to connect to your database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        
        <div className="space-y-2">
          <Label htmlFor="service-key">Service Role Key</Label>
          <Input 
            id="service-key" 
            placeholder="your-service-role-key" 
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            This is needed for database initialization and will not be stored.
          </p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleTestConnection} 
          disabled={!isValid || isTesting || isSavingToDb} 
          className="w-full"
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
      </CardFooter>
    </Card>
  );
}
