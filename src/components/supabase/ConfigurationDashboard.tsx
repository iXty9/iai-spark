import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfigStatusIndicator } from './ConfigStatusIndicator';
import { generateConfigFile } from '@/utils/config-generator';
import { writeConfigToLocalStorage, readConfigFromLocalStorage } from '@/services/site-config/site-config-file-service';
import { SiteConfigEnv } from '@/services/supabase/site-config-service';
import { Download, RefreshCw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationDashboardProps {
  onConfigSaved?: () => void;
}

export function ConfigurationDashboard({ onConfigSaved }: ConfigurationDashboardProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const { toast } = useToast();

  // Load existing configuration if available
  useEffect(() => {
    const loadExistingConfig = async () => {
      const config = readConfigFromLocalStorage();
      if (config) {
        setSupabaseUrl(config.supabaseUrl);
        setSupabaseAnonKey(config.supabaseAnonKey);
      }
    };
    
    loadExistingConfig();
  }, []);

  const handleSaveConfig = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "Validation Error",
        description: "Please provide both Supabase URL and Anonymous Key",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save to localStorage
      const config: SiteConfigEnv = {
        supabaseUrl,
        supabaseAnonKey,
        siteHost: window.location.hostname,
        lastUpdated: new Date().toISOString()
      };
      
      const success = writeConfigToLocalStorage(config);
      
      if (success) {
        toast({
          title: "Configuration Saved",
          description: "Supabase connection details have been saved successfully.",
          variant: "default"
        });
        
        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save configuration. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateConfigFile = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "Validation Error",
        description: "Please provide both Supabase URL and Anonymous Key",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await generateConfigFile(supabaseUrl, supabaseAnonKey);
      
      if (success) {
        toast({
          title: "Configuration File Generated",
          description: "site-config.json has been generated and downloaded. Place this file in your public directory. Note: This file contains sensitive information and should not be committed to version control.",
          variant: "default"
        });
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate configuration file. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Configuration</CardTitle>
        <CardDescription>
          Manage your Supabase connection settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConfigStatusIndicator onConfigureClick={() => setActiveTab('configure')} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="help">Help & Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configure" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">Supabase URL</Label>
                <Input
                  id="supabaseUrl"
                  placeholder="https://your-project-id.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  The URL of your Supabase project (found in your project settings)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabaseAnonKey">Supabase Anonymous Key</Label>
                <Input
                  id="supabaseAnonKey"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  type="password"
                />
                <p className="text-xs text-gray-500">
                  The anonymous/public API key (found in your project API settings)
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                onClick={handleSaveConfig} 
                disabled={isSubmitting || !supabaseUrl || !supabaseAnonKey}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to Browser
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleGenerateConfigFile}
                disabled={isSubmitting || !supabaseUrl || !supabaseAnonKey}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Generate Config File
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="help" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuration Methods</h3>
              
              <div className="space-y-2">
                <h4 className="text-md font-medium">1. Static Configuration File</h4>
                <p className="text-sm">
                  Create a <code>site-config.json</code> file in your project's public directory based on the <code>site-config.example.json</code> template:
                </p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`{
  "supabaseUrl": "https://your-project-id.supabase.co",
  "supabaseAnonKey": "your-anon-key",
  "siteHost": "your-site-hostname",
  "lastUpdated": "2023-01-01T00:00:00.000Z"
}`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-md font-medium">2. Environment Variables</h4>
                <p className="text-sm">
                  Add the following variables to your <code>.env</code> file:
                </p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_HOST=your-site-hostname`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-md font-medium">3. Browser Storage</h4>
                <p className="text-sm">
                  Use the configuration form to save settings to your browser's localStorage.
                  This is useful for development but not recommended for production.
                </p>
              </div>
              
              <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="text-md font-medium text-blue-800">Troubleshooting</h4>
                <ul className="list-disc pl-5 mt-2 text-sm text-blue-800">
                  <li>Make sure your Supabase project is active and running</li>
                  <li>Check that you've copied the correct URL and API key</li>
                  <li>Ensure your browser allows localStorage if using browser storage</li>
                  <li>Clear your browser cache if you're experiencing persistent issues</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          Configuration is stored securely and only used to connect to your Supabase instance.
        </p>
      </CardFooter>
    </Card>
  );
}
