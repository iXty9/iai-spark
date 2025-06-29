import { useState, useEffect } from 'react';
import { fetchAppSettings } from '@/services/admin/settingsService';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  const [aiAgentName, setAIAgentName] = useState<string>('AI Assistant');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAIAgentName = async () => {
      try {
        const settings = await fetchAppSettings();
        const agentName = settings.ai_agent_name || 'AI Assistant';
        setAIAgentName(agentName);
      } catch (error) {
        logger.error('Failed to load AI agent name:', error);
        // Keep default value on error
        setAIAgentName('AI Assistant');
      } finally {
        setIsLoading(false);
      }
    };

    loadAIAgentName();
  }, []);

  return { aiAgentName, isLoading };
};
