
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureStorageBucketsExist } from '@/services/supabase/storage-service';
import { logger } from '@/utils/logging';
import { toast } from '@/hooks/use-toast';

/**
 * Silent system component that performs automated self-healing operations
 * to ensure the application infrastructure is properly configured
 */
export function SystemSelfHealer() {
  const { user } = useAuth();
  const [healingPerformed, setHealingPerformed] = useState(false);

  // Perform self-healing operations when the user is authenticated
  useEffect(() => {
    let isMounted = true;
    
    // Only run once per session
    if (healingPerformed) return;
    
    const performHealing = async () => {
      try {
        logger.info('Starting system self-healing routine', { module: 'system' });
        
        // Ensure storage buckets exist (fix the "Bucket not found" error)
        const bucketsResult = await ensureStorageBucketsExist();
        
        if (!bucketsResult) {
          logger.error('Failed to heal storage buckets', { module: 'system' });
        } else {
          logger.info('Storage bucket check completed successfully', { module: 'system' });
        }
        
        // Add more self-healing operations here as needed
        
        if (isMounted) {
          setHealingPerformed(true);
          
          // Only show toast in development mode
          if (process.env.NODE_ENV === 'development') {
            toast({
              title: "System Check Complete",
              description: "Infrastructure verification completed successfully.",
              duration: 3000,
            });
          }
        }
      } catch (error) {
        logger.error('Error during system self-healing:', error, { module: 'system' });
        
        // Only show error toast in development mode
        if (process.env.NODE_ENV === 'development') {
          toast({
            title: "System Check Issues",
            description: "Some system repairs could not be completed.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    };
    
    // Only perform healing when user is authenticated
    if (user && !healingPerformed) {
      performHealing();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, healingPerformed]);
  
  // This component doesn't render anything visible
  return null;
}
