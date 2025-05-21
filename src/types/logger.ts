
export interface LogOptions {
  module?: string;
  payload?: any;
  bucketName?: string;
  function?: string;
  totalCount?: number;
  pageSize?: number;
  userId?: string;
  roleFilter?: string;
  lastConnection?: string;
  connectionInfo?: Record<string, any>;
  isInitialized?: boolean;
  environment?: string;
  endpoint?: string;
  isDev?: boolean;
  error?: any;
  [key: string]: any;
}
