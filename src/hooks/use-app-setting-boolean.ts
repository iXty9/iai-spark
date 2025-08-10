import { useEffect, useState } from 'react';
import { settingsCacheService } from '@/services/settings-cache-service';

export function useAppSettingBoolean(key: string, defaultValue: boolean = true) {
  const [value, setValue] = useState<boolean>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const settings = await settingsCacheService.getSettings();
        const raw = settings[key];
        const boolVal = raw === undefined ? defaultValue : raw !== 'false';
        if (mounted) {
          setValue(boolVal);
          setIsLoading(false);
        }
      } catch (e) {
        if (mounted) setIsLoading(false);
      }
    };

    const unsubscribe = settingsCacheService.addChangeListener((settings) => {
      if (!mounted) return;
      const raw = settings[key];
      const boolVal = raw === undefined ? defaultValue : raw !== 'false';
      setValue(boolVal);
      setIsLoading(false);
    });

    load();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key, defaultValue]);

  return { value, isLoading };
}
