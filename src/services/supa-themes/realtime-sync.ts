import { supabase } from '@/integrations/supabase/client';
import { ThemeSettings } from '@/types/theme';
import { logger } from '@/utils/logging';
import { SupaThemeState } from './types';
import { ThemePersistence } from './persistence';
import { ThemeApplier } from './theme-applier';

export class RealtimeSync {
  private realtimeChannel: any = null;

  constructor(
    private persistence: ThemePersistence,
    private themeApplier: ThemeApplier
  ) {}

  setupRealtimeSync(userId: string, state: SupaThemeState, notifyListeners: () => void): void {
    if (!userId) return;

    // Clean up existing channel
    this.cleanup();

    this.realtimeChannel = supabase
      .channel(`supa_themes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        async (payload) => {
          if (payload.new?.theme_settings) {
            const settings = JSON.parse(payload.new.theme_settings) as ThemeSettings;
            this.persistence.applyThemeSettings(settings, state);
            this.themeApplier.applyCurrentTheme(state);
            this.themeApplier.applyCurrentBackground(state);
            notifyListeners();
            logger.info('Theme synced from real-time update', { module: 'supa-themes' });
          }
        }
      )
      .subscribe();
  }

  cleanup(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}