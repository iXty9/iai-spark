import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  // Always start with default value, don't rely on potentially stale cache
  const [aiAgentName, setAIAgentName] = useState<string>('AI Assistant');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAIAgentName = async () => {
      try {
        const settings = await settingsCacheService.getSettings();
        const agentName = settings.ai_agent_name || 'AI Assistant';
        
        if (isMounted) {
          setAIAgentName(agentName);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to load AI agent name:', error);
        if (isMounted) {
          // Keep default value on error
          setIsLoading(false);
        }
      }
    };

    // Subscribe to cache changes for real-time updates
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      if (isMounted) {
        const agentName = settings.ai_agent_name || 'AI Assistant';
        setAIAgentName(agentName);
        logger.info('AI agent name updated from cache change', { agentName });
      }
    });

    // Load initial value
    loadAIAgentName();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { aiAgentName, isLoading };
};
