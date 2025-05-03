
// Re-export all types and functions from the smaller modules
export type {
  UserRole,
  UserWithRole,
  UsersFetchOptions,
  UsersSearchOptions,
  UsersFetchResult
} from './types/userTypes';

export {
  fetchUsers,
  searchUsers
} from './userService';

export {
  updateUserRole,
  checkIsAdmin
} from './roleService';
