import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { getConnectionInfo } from '@/services/supabase/connection-service';

const API_TIMEOUT = 30000; // 30 seconds

export const signIn = async (email: string, password: string) => {
  try {
    const connectionInfo = getConnectionInfo();
    console.log(`Attempting login with connection ID: ${connectionInfo.connectionId}`);
    console.log('Connection details:', connectionInfo);
    
    const authPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Login request timed out after 30 seconds")), API_TIMEOUT);
    });
    
    const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;

    if (error) {
      console.error('Login error details:', { 
        message: error.message,
        code: error.code,
        status: error.status,
        connectionId: connectionInfo.connectionId,
        environment: connectionInfo.environment
      });
      
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
      throw error;
    }
    
    console.log(`Login successful with connection ID: ${connectionInfo.connectionId}`);
    return data;
  } catch (error: any) {
    console.error('Error during sign in:', error);
    
    // Get connection information for debug purposes
    const connectionInfo = getConnectionInfo();
    console.error('Connection details during error:', connectionInfo);
    
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
    // Handle the case when supabase might be the fallback object
    if (typeof supabase.auth.signUp !== 'function') {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: "The authentication service is not available. Please initialize the application.",
      });
      throw new Error("Authentication service not available");
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
      setTimeout(() => reject(new Error("Registration request timed out after 3 minutes")), API_TIMEOUT);
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
    console.error('Error during sign up:', error);
    
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
    console.log('Signing out user...');
    
    localStorage.removeItem('supabase.auth.token');
    ['sb-refresh-token', 'sb-access-token', 'supabase.auth.expires_at', 'supabase.auth.refreshToken'].forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key} from localStorage:`, e);
      }
    });
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.startsWith('sb-')) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key} from localStorage:`, e);
        }
      }
    });
    
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) {
      console.error('Error during sign out API call:', error);
      toast({
        variant: "default",
        title: "Signed out",
        description: "You have been signed out. Some cleanup may happen in the background.",
      });
    } else {
      console.log('User has been signed out successfully, auth state cleared');
      toast({
        variant: "default",
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    }
  } catch (error: any) {
    console.error('Error during sign out process:', error);
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
    console.error('Error updating profile:', error);
    throw error;
  }
};
