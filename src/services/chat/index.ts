
export { processMessage as sendMessage } from './message-processor';
export { exportChat } from '../export/exportService';

// Add a global reference for dev mode state for components that can't use hooks
if (typeof window !== 'undefined') {
  window.addEventListener('devModeChanged', ((e: CustomEvent) => {
    (window as any).__DEV_MODE_ENABLED__ = e.detail.isDevMode;
  }) as EventListener);
}
