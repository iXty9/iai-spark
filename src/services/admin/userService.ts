import { logger } from '@/utils/logging';
// This file is being replaced by userRolesService.ts functionality
// Keeping it for backward compatibility

import { invokeAdminFunction } from './utils/adminFunctionUtils';
import { UsersFetchOptions, UsersSearchOptions, UsersFetchResult } from './types/userTypes';

// These functions are now handled by userRolesService.ts
// Left here for backward compatibility
export { fetchUsers, searchUsers } from './userRolesService';
