import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  // Check for immediately available cached data, otherwise use default
  const getInitialValue = () => {
    const cachedName = settingsCacheService.getSetting('ai_agent_name');
    logger.debug('Initial AI agent name from cache:', cachedName || 'AI Assistant', { module: 'ai-agent-name' });
    return cachedName || 'AI Assistant';
  };

  const [aiAgentName, setAIAgentName] = useState<string>(getInitialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAIAgentName = async () => {
      try {
        logger.info('Loading AI agent name from settings service', { module: 'ai-agent-name' });
        const settings = await settingsCacheService.getSettings();
        const agentName = settings.ai_agent_name || 'AI Assistant';
        
        if (isMounted) {
          logger.info('AI agent name loaded successfully:', agentName, { module: 'ai-agent-name' });
          setAIAgentName(agentName);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to load AI agent name:', error, { module: 'ai-agent-name' });
        if (isMounted) {
          // Keep current value (which might be from cache) on error
          setIsLoading(false);
        }
      }
    };

    // Subscribe to cache changes for real-time updates
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      if (isMounted) {
        const agentName = settings.ai_agent_name || 'AI Assistant';
        logger.info('AI agent name updated from cache change:', agentName, { module: 'ai-agent-name' });
        setAIAgentName(agentName);
        setIsLoading(false);
      }
    });

    // Immediately trigger fresh data load - don't wait for cache
    loadAIAgentName();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { aiAgentName, isLoading };
};
