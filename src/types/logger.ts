
export interface LogOptions {
  module?: string;
  payload?: any;
  bucketName?: string;
  function?: string;
  totalCount?: number;
  pageSize?: number;
  userId?: string;
  roleFilter?: string;
  [key: string]: any;
}
