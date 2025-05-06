
import { logger } from '@/utils/logging';
import { getUserRole, setUserRole, hasRole } from './roleService';
import { UserRole } from './types/userTypes';

export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  return setUserRole(userId, role);
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    return await hasRole(userId, 'admin');
  } catch (error) {
    logger.error('Error checking admin role:', error);
    return false;
  }
}

// Re-export from roleService
export { 
  getUserRole,
  hasRole
};
