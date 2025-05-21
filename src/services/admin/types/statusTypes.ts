
export enum StatusType {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DELETED = 'deleted'
}

export interface StatusChangeParams {
  userId: string;
  status: StatusType;
  reason?: string;
}

export interface StatusChangeResult {
  success: boolean;
  message: string;
  error?: any;
}
