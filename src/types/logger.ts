
export interface LogOptions {
  module?: string;
  payload?: any;
  bucketName?: string;
  function?: string;
  totalCount?: number;
  pageSize?: number;
  [key: string]: any;
}
