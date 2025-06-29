
import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  // Check for immediately available cached data, otherwise use default
  const getInitialValue = () => {
    const cachedName = settingsCacheService.getSetting('ai_agent_name');
    return cachedName || 'AI Assistant';
  };

  const [aiAgentName, setAIAgentName] = useState<string>(getInitialValue);
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
          logger.info('AI agent name loaded', { name: agentName }, { module: 'ai-agent-name', once: true });
        }
      } catch (error) {
        logger.error('Failed to load AI agent name', error, { module: 'ai-agent-name' });
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Subscribe to cache changes for real-time updates
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      if (isMounted) {
        const agentName = settings.ai_agent_name || 'AI Assistant';
        setAIAgentName(agentName);
        setIsLoading(false);
      }
    });

    // Trigger fresh data load
    loadAIAgentName();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { aiAgentName, isLoading };
};
