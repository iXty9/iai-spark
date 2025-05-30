
// Define user roles
export type UserRole = 'admin' | 'moderator' | 'user';

// User with role information
export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: UserRole;
  last_sign_in_at?: string;
  user_metadata?: any;
  username?: string;
}

// Options for fetching users
export interface UsersFetchOptions {
  page?: number;
  pageSize?: number;
  roleFilter?: UserRole | 'all';
}

// Options for searching users
export interface UsersSearchOptions extends UsersFetchOptions {
  searchQuery: string;
}

// Result of user fetch operations
export interface UsersFetchResult {
  users: UserWithRole[];
  totalCount: number;
}

// Form validation schemas
export interface UserFormData {
  email: string;
  username?: string;
  role: UserRole;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}
