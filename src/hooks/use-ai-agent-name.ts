import { useState, useEffect } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';
import { logger } from '@/utils/logging';

export const useAIAgentName = () => {
  // Check for immediately available cached data, otherwise use default
  const getInitialValue = () => {
    const cachedName = settingsCacheService.getSetting('ai_agent_name');
    console.log('[AI-AGENT-NAME] Initial value from cache:', cachedName || 'AI Assistant');
    return cachedName || 'AI Assistant';
  };

  const [aiAgentName, setAIAgentName] = useState<string>(getInitialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AI-AGENT-NAME] useEffect started, mounting hook');
    let isMounted = true;

    const loadAIAgentName = async () => {
      console.log('[AI-AGENT-NAME] loadAIAgentName called');
      try {
        console.log('[AI-AGENT-NAME] Calling settingsCacheService.getSettings()');
        const settings = await settingsCacheService.getSettings();
        const agentName = settings.ai_agent_name || 'AI Assistant';
        
        console.log('[AI-AGENT-NAME] Settings loaded:', settings);
        console.log('[AI-AGENT-NAME] AI agent name extracted:', agentName);
        
        if (isMounted) {
          console.log('[AI-AGENT-NAME] Updating state with agent name:', agentName);
          setAIAgentName(agentName);
          setIsLoading(false);
        } else {
          console.log('[AI-AGENT-NAME] Component unmounted, skipping state update');
        }
      } catch (error) {
        console.error('[AI-AGENT-NAME] Failed to load AI agent name:', error);
        if (isMounted) {
          // Keep current value (which might be from cache) on error
          console.log('[AI-AGENT-NAME] Keeping current value on error:', aiAgentName);
          setIsLoading(false);
        }
      }
    };

    // Subscribe to cache changes for real-time updates
    console.log('[AI-AGENT-NAME] Adding change listener');
    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      console.log('[AI-AGENT-NAME] Change listener triggered with settings:', settings);
      if (isMounted) {
        const agentName = settings.ai_agent_name || 'AI Assistant';
        console.log('[AI-AGENT-NAME] Updating from cache change:', agentName);
        setAIAgentName(agentName);
        setIsLoading(false);
      } else {
        console.log('[AI-AGENT-NAME] Component unmounted, ignoring cache change');
      }
    });

    // Immediately trigger fresh data load - don't wait for cache
    console.log('[AI-AGENT-NAME] Triggering fresh data load');
    loadAIAgentName();

    return () => {
      console.log('[AI-AGENT-NAME] Cleanup: component unmounting');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  console.log('[AI-AGENT-NAME] Hook returning:', { aiAgentName, isLoading });
  return { aiAgentName, isLoading };
};
