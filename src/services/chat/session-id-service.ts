import { v4 as uuidv4 } from 'uuid';

const ANON_SESSION_KEY = 'app:anonymous_session_id';

/**
 * Session ID Service
 * 
 * Manages session identifiers for chat memory isolation:
 * - Authenticated users: Use their Supabase user_id as sessionId
 * - Anonymous users: Generate and persist a UUID in sessionStorage
 */

/**
 * Generate or retrieve a session ID
 * @param userId - Supabase user ID (null for anonymous users)
 * @returns sessionId for n8n chat memory isolation
 */
export const getSessionId = (userId: string | null): string => {
  // Authenticated users: use their user_id directly
  if (userId) {
    return userId;
  }
  
  // Anonymous users: get or create session ID from sessionStorage
  try {
    let anonSessionId = sessionStorage.getItem(ANON_SESSION_KEY);
    
    if (!anonSessionId) {
      // Generate new anonymous session ID with prefix
      anonSessionId = `anon_${uuidv4()}`;
      sessionStorage.setItem(ANON_SESSION_KEY, anonSessionId);
    }
    
    return anonSessionId;
  } catch (error) {
    // Fallback if sessionStorage is unavailable (rare edge case)
    return `anon_${uuidv4()}`;
  }
};

/**
 * Clear the anonymous session ID (useful for "New Chat" functionality)
 */
export const clearAnonymousSession = (): void => {
  try {
    sessionStorage.removeItem(ANON_SESSION_KEY);
  } catch (error) {
    // Silent fail if sessionStorage unavailable
  }
};
