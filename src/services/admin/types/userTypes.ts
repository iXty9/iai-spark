
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DELETED = 'deleted'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status: UserStatus;
  roles: string[];
  created_at: string;
  last_sign_in?: string;
}

export interface UserWithRole extends User {
  role: string;
  last_sign_in_at?: string;
}

export interface UsersSearchOptions {
  query: string;
  field?: 'email' | 'username' | 'name';
  status?: UserStatus;
  role?: string;
}

export interface UsersFetchResult {
  users: UserWithRole[];
  count: number;
}

export interface UsersFetchOptions {
  page?: number;
  perPage?: number;
  searchQuery?: string;
  status?: UserStatus;
  role?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  roleFilter?: string;
}

export interface UserManagementState {
  users: User[];
  loading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  connectionStatus: boolean;
  selectedUser: User | null;
  dialog: {
    type: string;
    isOpen: boolean;
    data: any;
  };
  updatingRole: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setSelectedUser: (user: User | null) => void;
  setDialog: (dialog: { type: string; isOpen: boolean; data: any }) => void;
  fetchUserList: (options?: UsersFetchOptions) => Promise<void>;
  removeUser: (userId: string) => Promise<boolean>;
  changeUserStatus: (userId: string, status: UserStatus, reason?: string) => Promise<boolean>;
  assignRole: (userId: string, role: string) => Promise<boolean>;
  removeRole: (userId: string, role: string) => Promise<boolean>;
  fetchAndSetUsers: (resetPage?: boolean) => void;
  confirmRoleUpdate: (role: string) => Promise<void>;
  resetEnvironmentConfig: () => void;
  reinitializeConnection: () => void;
}
