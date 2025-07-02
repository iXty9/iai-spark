import { logger } from '@/utils/logging';
import { ThemePersistence } from './persistence';

export class AutoSave {
  private autoSaveTimer: any = null;
  private isSaving: boolean = false;

  constructor(private persistence: ThemePersistence) {}

  scheduleAutoSave(userId: string, saveTheme: () => Promise<boolean>): void {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    // Set new timer with 1.5 second debounce
    this.autoSaveTimer = setTimeout(async () => {
      await this.performAutoSave(saveTheme);
    }, 1500);
  }

  private async performAutoSave(saveTheme: () => Promise<boolean>): Promise<void> {
    if (this.isSaving) return;
    
    try {
      this.isSaving = true;
      await saveTheme();
      logger.info('Theme auto-saved successfully', { module: 'supa-themes' });
    } catch (error) {
      logger.error('Auto-save failed:', error, { module: 'supa-themes' });
    } finally {
      this.isSaving = false;
    }
  }

  cleanup(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.isSaving = false;
  }
}