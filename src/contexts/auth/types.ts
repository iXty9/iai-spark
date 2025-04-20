
import { Session, User } from '@supabase/supabase-js';

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, phone_number?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<any>) => Promise<void>;
};
