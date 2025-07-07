import { SupaToastConfig } from './types';

export const DEFAULT_CONFIG: SupaToastConfig = {
  maxToasts: 5,
  defaultDuration: 5000,
  defaultPosition: 'bottom-right',
  enableBrowserNotifications: true,
  enableWebSocketToasts: true,
  enableSonnerIntegration: false,
  enableShadcnIntegration: true,
};

export const TOAST_DURATIONS = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
  default: 5000,
} as const;

export const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  default: '💬',
} as const;