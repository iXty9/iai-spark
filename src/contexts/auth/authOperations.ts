import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { clientManager } from '@/services/supabase/client-manager';
import { logger } from '@/utils/logging';

const API_TIMEOUT = 30000; // 30 seconds

export const signIn = async (email: string, password: string) => {
  try {
    // Ensure client is ready
    const client = clientManager.getClient();
    if (!client) {
      throw new Error('Authentication service not available. Please ensure the application is properly initialized.');
    }

    logger.info('Attempting login', { module: 'auth-operations', email: email.substring(0, 3) + '***' });
    
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
      
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
      throw error;
    }
    
    logger.info('Login successful', { module: 'auth-operations', userId: data.user?.id });
    return data;
  } catch (error: any) {
    logger.error('Error during sign in', error, { module: 'auth-operations' });
    
    const errorMessage = error.message || "Login failed. Please try again later.";
    toast({
      variant: "destructive",
      title: "Login error",
      description: errorMessage,
    });
    
    throw error;
  }
};

export const signUp = async (
  email: string, 
  password: string, 
  username: string, 
  options?: { phone_number?: string, full_name?: string }
) => {
  try {
    // Ensure client is ready
    const client = clientManager.getClient();
    if (!client) {
      throw new Error('Authentication service not available. Please ensure the application is properly initialized.');
    }
    
    const authPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          phone_number: options?.phone_number,
          full_name: options?.full_name,
        },
      },
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Registration request timed out after 30 seconds")), API_TIMEOUT);
    });
    
    const { error } = await Promise.race([authPromise, timeoutPromise]) as any;

    if (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message,
      });
      throw error;
    }
    
    toast({
      title: "Account created",
      description: "Please check your email to confirm your account.",
    });
  } catch (error: any) {
    logger.error('Error during sign up', error, { module: 'auth-operations' });
    
    const errorMessage = error.message || "Sign up failed. Please try again later.";
    toast({
      variant: "destructive",
      title: "Registration error",
      description: errorMessage,
    });
    
    throw error;
  }
};

export const signOut = async () => {
  try {
    logger.info('Signing out user', { module: 'auth-operations' });
    
    // Clear localStorage auth data
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
    
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) {
      logger.error('Error during sign out API call', error, { module: 'auth-operations' });
      toast({
        variant: "default",
        title: "Signed out",
        description: "You have been signed out. Some cleanup may happen in the background.",
      });
    } else {
      logger.info('User signed out successfully', { module: 'auth-operations' });
      toast({
        variant: "default",
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    }
  } catch (error: any) {
    logger.error('Error during sign out process', error, { module: 'auth-operations' });
    toast({
      variant: "default",
      title: "Signed out",
      description: "You have been signed out locally. Some cleanup may happen in the background.",
    });
  }
};

export const updateProfile = async (supabase: any, userId: string, data: Partial<any>) => {
  try {
    if (!userId) throw new Error('No user logged in');

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
