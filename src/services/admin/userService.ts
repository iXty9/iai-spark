
import { logger } from '@/utils/logging';
// This file is being replaced by userRolesService.ts functionality
// Keeping it for backward compatibility

// Re-export types and functions from userRolesService
export { 
  fetchUsers, 
  searchUsers, 
  updateUserRole
} from './userRolesService';

// Re-export types
export type { 
  UserWithRole,
  UserRole,
  UsersFetchOptions,
  UsersSearchOptions,
  UsersFetchResult
} from './userRolesService';
