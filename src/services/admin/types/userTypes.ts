
export type UserRole = 'admin' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  role: UserRole;
  username?: string;
}

export interface UsersFetchOptions {
  page?: number;
  pageSize?: number;
  roleFilter?: UserRole;
}

export interface UsersSearchOptions extends UsersFetchOptions {
  searchQuery: string;
}

export interface UsersFetchResult {
  users: UserWithRole[];
  totalCount: number;
}
