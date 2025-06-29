import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  // Initialize with cached value if available, otherwise use default
  const [aiAgentName, setAIAgentName] = useState<string>(() => {
    const cached = settingsCacheService.getSetting('ai_agent_name', 'AI Assistant');
    return cached || 'AI Assistant';
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAIAgentName = async () => {
      setIsLoading(true);
      try {
        const settings = await settingsCacheService.getSettings();
        const agentName = settings.ai_agent_name || 'AI Assistant';
        setAIAgentName(agentName);
      } catch (error) {
        logger.error('Failed to load AI agent name:', error);
        // Keep current value on error (which is either cached or default)
      } finally {
        setIsLoading(false);
      }
    };

    loadAIAgentName();
  }, []);

  return { aiAgentName, isLoading };
};
