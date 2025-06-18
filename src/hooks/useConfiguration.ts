
import { useState, useEffect } from 'react';
import { configManager, AppConfig, ConfigLoadResult } from '@/services/config/ConfigurationManager';
import { initializationService } from '@/services/config/initialization-service';

export interface UseConfigurationResult {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  saveConfiguration: (config: Partial<AppConfig>) => Promise<boolean>;
  clearConfiguration: () => void;
  reload: () => Promise<void>;
}

/**
 * Simplified configuration hook
 * Replaces multiple scattered configuration hooks
 */
export function useConfiguration(): UseConfigurationResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadConfiguration = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await configManager.loadConfiguration();
      
      if (result.success && result.config) {
        setConfig(result.config);
        setIsInitialized(true);
      } else {
        setConfig(null);
        setIsInitialized(false);
        setError(result.error || 'Failed to load configuration');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setConfig(null);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (newConfig: Partial<AppConfig>): Promise<boolean> => {
    try {
      const result = configManager.saveConfiguration(newConfig);
      
      if (result.success && result.config) {
        setConfig(result.config);
        setIsInitialized(true);
        setError(null);
        
        // Reinitialize the application with new config
        await initializationService.initialize();
        
        return true;
      } else {
        setError(result.error || 'Failed to save configuration');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    }
  };

  const clearConfiguration = () => {
    configManager.clearConfiguration();
    initializationService.reset();
    setConfig(null);
    setIsInitialized(false);
    setError(null);
  };

  const reload = async () => {
    await loadConfiguration();
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  return {
    config,
    isLoading,
    error,
    isInitialized,
    saveConfiguration,
    clearConfiguration,
    reload
  };
}
