import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle
} from '@/components/ui/card';
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

const fields = [
  {
    id: 'supabaseUrl',
    label: 'Supabase URL',
    placeholder: 'https://your-project-id.supabase.co',
    desc: 'The URL of your Supabase project (found in your project settings)',
    type: 'text'
  },
  {
    id: 'supabaseAnonKey',
    label: 'Supabase Anonymous Key',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    desc: 'The anonymous/public API key (found in your project API settings)',
    type: 'password'
  }
];

export function ConfigurationDashboard({ onConfigSaved }) {
  const [state, setState] = useState({ supabaseUrl: '', supabaseAnonKey: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const { toast } = useToast();

  // Load config from localStorage on mount
  useEffect(() => {
    const config = readConfigFromLocalStorage();
    if (config) setState({
      supabaseUrl: config.supabaseUrl || '',
      supabaseAnonKey: config.supabaseAnonKey || ''
    });
  }, []);

  const handleMissingFields = () => toast({
    title: "Validation Error",
    description: "Please provide both Supabase URL and Anonymous Key",
    variant: "destructive"
  });

  const hasFields = state.supabaseUrl && state.supabaseAnonKey;

  const handleSaveConfig = async () => {
    if (!hasFields) return handleMissingFields();
    setIsSubmitting(true);
    try {
      const config: SiteConfigEnv = {
        ...state,
        siteHost: window.location.hostname,
        lastUpdated: new Date().toISOString()
      };
      if (writeConfigToLocalStorage(config)) {
        toast({
          title: "Configuration Saved",
          description: "Supabase connection details have been saved successfully.",
        });
        onConfigSaved?.();
      } else {
        toast({ title: "Save Failed", description: "Failed to save configuration. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "An unknown error occurred", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleGenerateConfigFile = async () => {
    if (!hasFields) return handleMissingFields();
    setIsSubmitting(true);
    try {
      if (await generateConfigFile(state.supabaseUrl, state.supabaseAnonKey)) {
        toast({
          title: "Configuration File Generated",
          description: "site-config.json has been generated and downloaded. Place this file in your public directory. Note: This file contains sensitive information and should not be committed to version control.",
        });
      } else {
        toast({ title: "Generation Failed", description: "Failed to generate configuration file. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "An unknown error occurred", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Configuration</CardTitle>
        <CardDescription>Manage your Supabase connection settings</CardDescription>
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
              {fields.map(({ id, label, placeholder, desc, type }) => (
                <div className="space-y-2" key={id}>
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    placeholder={placeholder}
                    value={state[id]}
                    type={type}
                    onChange={e => setState(s => ({ ...s, [id]: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                onClick={handleSaveConfig}
                disabled={isSubmitting || !hasFields}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save to Browser
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateConfigFile}
                disabled={isSubmitting || !hasFields}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" /> Generate Config File
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="help" className="space-y-4 mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuration Methods</h3>
              <div className="space-y-2">
                <h4 className="text-md font-medium">1. Static Configuration File</h4>
                <p className="text-sm">
                  Create a <code>site-config.json</code> file in your project's public directory based on <code>site-config.example.json</code>:
                </p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{`{
  "supabaseUrl": "https://your-project-id.supabase.co",
  "supabaseAnonKey": "your-anon-key",
  "siteHost": "your-site-hostname",
  "lastUpdated": "2023-01-01T00:00:00.000Z"
}`}</pre>
              </div>
              <div className="space-y-2">
                <h4 className="text-md font-medium">2. Environment Variables</h4>
                <p className="text-sm">Add the following variables to your <code>.env</code> file:</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_HOST=your-site-hostname`}</pre>
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