
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testSupabaseConnection } from '@/services/supabase/connection-service';
import { Loader2, Save, Cloud, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveConnectionConfig } from '@/services/admin/settingsService';
import { updateAllSiteConfigurations } from '@/services/supabase/site-config-service';
import { Switch } from '@/components/ui/switch';
import { updateStaticSiteConfig } from '@/services/site-config/site-config-file-service';

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
  const [isSavingToSiteEnv, setIsSavingToSiteEnv] = useState(false);
  const [isSavingToStaticFile, setIsSavingToStaticFile] = useState(false);
  const [saveToSiteEnv, setSaveToSiteEnv] = useState(true);
  const [saveToStaticFile, setSaveToStaticFile] = useState(true);
  
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
            
            // If requested, also save to site environment
            if (saveToSiteEnv) {
              setIsSavingToSiteEnv(true);
              try {
                // Use the new updateAllSiteConfigurations function to ensure consistency
                const allSaved = await updateAllSiteConfigurations(url, anonKey);
                
                if (allSaved) {
                  toast({
                    title: "Site configuration saved",
                    description: "Connection settings have been saved to the site environment for automatic connection.",
                  });
                } else {
                  toast({
                    title: "Warning",
                    description: "Connected successfully, but couldn't save site environment configuration.",
                    variant: "default"
                  });
                }
              } catch (err) {
                console.error("Failed to save to site environment:", err);
              } finally {
                setIsSavingToSiteEnv(false);
              }
            }
            
            // If requested, also save to static file
            if (saveToStaticFile) {
              setIsSavingToStaticFile(true);
              try {
                const staticFileSaved = await updateStaticSiteConfig({
                  supabaseUrl: url,
                  supabaseAnonKey: anonKey,
                  siteHost: window.location.hostname,
                  lastUpdated: new Date().toISOString()
                });
                
                if (staticFileSaved) {
                  toast({
                    title: "Static configuration saved",
                    description: "Connection settings have been saved to a static file for truly stateless bootstrapping.",
                  });
                } else {
                  toast({
                    title: "Warning",
                    description: "Could not save configuration to static file. This feature requires server-side API support.",
                    variant: "default"
                  });
                }
              } catch (err) {
                console.error("Failed to save to static file:", err);
              } finally {
                setIsSavingToStaticFile(false);
              }
            }
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
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="save-site-env" 
          checked={saveToSiteEnv}
          onCheckedChange={setSaveToSiteEnv}
        />
        <Label htmlFor="save-site-env" className="text-sm">
          Save as site environment configuration for automatic connection
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="save-static-file" 
          checked={saveToStaticFile}
          onCheckedChange={setSaveToStaticFile}
        />
        <Label htmlFor="save-static-file" className="text-sm">
          Generate static configuration file for stateless bootstrapping
        </Label>
      </div>
      
      {saveToSiteEnv && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-700">
          <Cloud className="h-4 w-4 inline-block mr-1 text-blue-500" />
          This will save connection details to enable automatic connection for other users and browsers.
        </div>
      )}
      
      {saveToStaticFile && (
        <div className="bg-green-50 border border-green-100 p-3 rounded-md text-sm text-green-700">
          <FileText className="h-4 w-4 inline-block mr-1 text-green-500" />
          This will generate a static file to enable truly stateless bootstrapping without requiring an initial connection.
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <Button 
        onClick={handleTestConnection} 
        disabled={!isValid || isTesting || isSavingToDb || isSavingToSiteEnv || isSavingToStaticFile} 
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
        ) : isSavingToSiteEnv ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Site Environment...
          </>
        ) : isSavingToStaticFile ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Static Config File...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Connect to Supabase
          </>
        )}
      </Button>
    </div>
  );
}
