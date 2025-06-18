import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { connectionService } from '@/services/config/connection-service';

export const deleteUser = async (userId: string) => {
  try {
    logger.info('Attempting to delete user', { userId });
    
    // Get current config for URL construction
    const config = connectionService.getCurrentConfig();
    if (!config) {
      throw new Error('No configuration available');
    }
    
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId }
    });

    if (error) {
      logger.error('Error deleting user', error);
      throw error;
    }

    toast({
      title: "Success",
      description: "User deleted successfully",
    });
    
    logger.info('User deleted successfully', { userId });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to delete user';
    
    toast({
      variant: "destructive",
      title: "Error",
      description: errorMessage,
    });
    
    logger.error('Failed to delete user', error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  try {
    logger.info('Attempting to update user role', { userId, role });
    
    const { error } = await supabase.functions.invoke('admin-update-user-role', {
      body: { userId, role }
    });

    if (error) {
      logger.error('Error updating user role', error);
      throw error;
    }

    toast({
      title: "Success",
      description: "User role updated successfully",
    });
    
    logger.info('User role updated successfully', { userId, role });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to update user role';
    
    toast({
      variant: "destructive",
      title: "Error",
      description: errorMessage,
    });
    
    logger.error('Failed to update user role', error);
    throw error;
  }
};

// Export the useUserManagementActions function that's expected by the index file
export const useUserManagementActions = (state: any, dispatch: any, debouncedSearchQuery: string) => {
  return {
    executeSearch: async (isSearch = false) => {
      // This would contain the search logic - keeping minimal for now
      logger.info('Execute search called', { isSearch, debouncedSearchQuery });
    },
    checkConnection: async () => {
      // This would contain connection check logic
      logger.info('Check connection called');
    },
    confirmRoleUpdate: async (role: string) => {
      // This would contain role update logic
      logger.info('Confirm role update called', { role });
    },
    resetEnvironmentConfig: () => {
      // This would contain reset logic
      logger.info('Reset environment config called');
    },
    reinitializeConnection: async () => {
      // This would contain reinitialize logic
      logger.info('Reinitialize connection called');
    }
  };
};
