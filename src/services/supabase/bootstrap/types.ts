
export interface ConnectionConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  isInitialized?: boolean;
  lastConnection?: string;
}

export interface ConnectionTestResult {
  isConnected: boolean;
  hasPermissions: boolean;
  error?: string;
  errorCode?: string;
}

export interface BootstrapConfigResult {
  config?: ConnectionConfig;
  error?: string;
  code?: string;
}
