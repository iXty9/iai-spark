
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfiguration } from '@/hooks/useConfiguration';
import { configManager } from '@/services/config/ConfigurationManager';

interface ConfigurationFormProps {
  onSuccess?: () => void;
}

/**
 * Simplified configuration form
 * Replaces the complex SupabaseConnectionForm and ConfigurationDashboard
 */
export function ConfigurationForm({ onSuccess }: ConfigurationFormProps) {
  const { config, saveConfiguration } = useConfiguration();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    supabaseUrl: config?.supabaseUrl || '',
    supabaseAnonKey: config?.supabaseAnonKey || ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    if (!formData.supabaseUrl || !formData.supabaseAnonKey) {
      toast({
        title: "Validation Error",
        description: "Please provide both URL and API key",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    
    try {
      const result = await configManager.testConnection(
        formData.supabaseUrl,
        formData.supabaseAnonKey
      );

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Supabase"
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to Supabase",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.supabaseUrl || !formData.supabaseAnonKey) {
      toast({
        title: "Validation Error",
        description: "Please provide both URL and API key",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await saveConfiguration(formData);

      if (success) {
        toast({
          title: "Configuration Saved",
          description: "Your configuration has been saved successfully"
        });
        onSuccess?.();
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.supabaseUrl.trim() && formData.supabaseAnonKey.trim();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Configuration</CardTitle>
        <CardDescription>
          Configure your Supabase connection settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="supabase-url">Supabase URL</Label>
          <Input
            id="supabase-url"
            placeholder="https://your-project.supabase.co"
            value={formData.supabaseUrl}
            onChange={(e) => handleInputChange('supabaseUrl', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Find this in your Supabase project settings under API
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supabase-key">Anonymous Key</Label>
          <Input
            id="supabase-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={formData.supabaseAnonKey}
            onChange={(e) => handleInputChange('supabaseAnonKey', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your project's anonymous/public API key
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isValid || isTesting || isLoading}
            className="flex-1"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isValid || isLoading || isTesting}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
