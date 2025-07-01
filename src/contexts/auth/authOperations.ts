
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { logger } from '@/utils/logging';
import { clientManager } from '@/services/supabase/client-manager';
import { sendUserSignupWebhook } from '@/services/webhook';

const API_TIMEOUT = 30000; // 30 seconds

// Helper function to ensure client is ready
const ensureClientReady = async (): Promise<boolean> => {
  const isReady = await clientManager.waitForReadiness();
  if (!isReady) {
    throw new Error("Authentication service is not available. Please try again or check your connection.");
  }
  return true;
};

export const signIn = async (email: string, password: string) => {
  try {
    logger.info('Attempting login', { module: 'auth-operations', email: email.substring(0, 3) + '***' });
    
    // Ensure client is ready before attempting login
    await ensureClientReady();
    
    const authPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Login request timed out after 30 seconds")), API_TIMEOUT);
    });
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;

    if (error) {
      logger.error('Login error', error, { module: 'auth-operations' });
      throw error; // Let the UI handle error display
    }
    
    logger.info('Login successful', { module: 'auth-operations', userId: data.user?.id });
    return data;
  } catch (error: any) {
    logger.error('Error during sign in', error, { module: 'auth-operations' });
    throw error; // Let the UI handle error display
  }
};

export const signUp = async (
  email: string, 
  password: string, 
  username: string, 
  options?: { phone_number?: string, full_name?: string, first_name?: string, last_name?: string }
) => {
  try {
    // Ensure client is ready before attempting signup
    await ensureClientReady();
    
    const authPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          phone_number: options?.phone_number,
          full_name: options?.full_name,
          first_name: options?.first_name,
          last_name: options?.last_name,
        },
      },
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Registration request timed out after 30 seconds")), API_TIMEOUT);
    });
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;

    if (error) {
      logger.error('Signup error', error, { module: 'auth-operations' });
      throw error; // Let the UI handle error display
    }
    
    // Send signup webhook (don't await to avoid blocking signup)
    if (data?.user) {
      sendUserSignupWebhook({
        email,
        username,
        firstName: options?.first_name,
        lastName: options?.last_name,
        phoneNumber: options?.phone_number,
        timestamp: new Date().toISOString()
      }).catch(webhookError => {
        // Log webhook error but don't affect signup success
        logger.error('Signup webhook failed but user registration succeeded', webhookError, { module: 'auth-operations' });
      });
    }
    
    toast({
      title: "Account created",
      description: "Please check your email to confirm your account.",
    });
  } catch (error: any) {
    logger.error('Error during sign up', error, { module: 'auth-operations' });
    throw error; // Let the UI handle error display
  }
};

export const signOut = async () => {
  try {
    logger.info('Signing out user', { module: 'auth-operations' });
    
    // Clear localStorage auth data first
    localStorage.removeItem('supabase.auth.token');
    ['sb-refresh-token', 'sb-access-token', 'supabase.auth.expires_at', 'supabase.auth.refreshToken'].forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        logger.warn(`Failed to remove ${key} from localStorage`, e, { module: 'auth-operations' });
      }
    });
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.startsWith('sb-')) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          logger.warn(`Failed to remove ${key} from localStorage`, e, { module: 'auth-operations' });
        }
      }
    });
    
    // Try to sign out via API if client is available
    try {
      await ensureClientReady();
      const { error } = await supabase.auth.signOut({
        scope: 'global'
      });
      
      if (error) {
        logger.error('Error during sign out API call', error, { module: 'auth-operations' });
      } else {
        logger.info('User signed out successfully', { module: 'auth-operations' });
      }
    } catch (clientError) {
      // If client is not available, local signout is still effective
      logger.warn('Client not available for API signout, local signout completed', clientError, { module: 'auth-operations' });
    }
    
    toast({
      variant: "default",
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  } catch (error: any) {
    logger.error('Error during sign out process', error, { module: 'auth-operations' });
    toast({
      variant: "default",
      title: "Signed out",
      description: "You have been signed out locally.",
    });
  }
};

export const updateProfile = async (supabase: any, userId: string, data: Partial<any>) => {
  try {
    if (!userId) throw new Error('No user logged in');

    await ensureClientReady();

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
      throw error;
    }
    
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  } catch (error: any) {
    logger.error('Error updating profile', error, { module: 'auth-operations' });
    throw error;
  }
};
