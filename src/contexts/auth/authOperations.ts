
import { supabase } from "@/integrations/supabase/client";
import { User, AuthError, Provider } from "@supabase/supabase-js";
import { logger } from "@/utils/logging";

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const client = await supabase;
    if (!client) throw new Error("Supabase client not available");
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data.user;
  } catch (error) {
    logger.error("Error signing in with email", error);
    throw error;
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, metadata?: { [key: string]: any }): Promise<User | null> {
  try {
    const client = await supabase;
    if (!client) throw new Error("Supabase client not available");
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    
    if (error) throw error;
    return data.user;
  } catch (error) {
    logger.error("Error signing up with email", error);
    throw error;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  try {
    const client = await supabase;
    if (!client) throw new Error("Supabase client not available");
    
    const { error } = await client.auth.signOut();
    if (error) throw error;
  } catch (error) {
    logger.error("Error signing out", error);
    throw error;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = await supabase;
    if (!client) return null;
    
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  } catch (error) {
    logger.error("Error getting current user", error);
    return null;
  }
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<User | null> {
  try {
    const client = await supabase;
    if (!client) return null;
    
    const { data, error } = await client.auth.refreshSession();
    if (error) return null;
    return data.user;
  } catch (error) {
    logger.error("Error refreshing session", error);
    return null;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  try {
    const client = await supabase;
    if (!client) throw new Error("Supabase client not available");
    
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    logger.error("Error sending password reset email", error);
    throw error;
  }
}

/**
 * Update password
 */
export async function updatePassword(password: string): Promise<User | null> {
  try {
    const client = await supabase;
    if (!client) throw new Error("Supabase client not available");
    
    const { data, error } = await client.auth.updateUser({
      password
    });
    
    if (error) throw error;
    return data.user;
  } catch (error) {
    logger.error("Error updating password", error);
    throw error;
  }
}
