
import { StatusType } from './statusTypes';

export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  status: StatusType;
  role?: UserRole;
  created_at: string;
  last_sign_in_at?: string;
}

export interface UsersFetchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  status?: StatusType;
  role?: UserRole;
  searchQuery?: string;
}

export interface UsersSearchOptions {
  query: string;
  status?: StatusType;
  role?: UserRole;
}

export interface UsersPaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UsersFetchResult {
  users: UserProfile[];
  metadata: UsersPaginationMetadata;
}
