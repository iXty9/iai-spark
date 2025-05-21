
export type UserRole = 'admin' | 'moderator' | 'user';

export interface UserWithRole {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
}

export interface UsersFetchOptions {
  page?: number;
  pageSize?: number;
  roleFilter?: UserRole;
  searchQuery?: string;
}

export interface UsersFetchResult {
  users: UserWithRole[];
  totalCount: number;
}
