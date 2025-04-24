
import { Session, User } from '@supabase/supabase-js';

export type ProfileType = {
  id: string;
  username?: string;
  avatar_url?: string;
  phone_number?: string;
  full_name?: string;
  theme_settings?: string; // JSON string containing theme settings
};

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: ProfileType | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, options?: { phone_number?: string, full_name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileType>) => Promise<void>;
};
