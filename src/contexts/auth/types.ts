
import { Session, User } from '@supabase/supabase-js';

export type ProfileType = {
  id: string;
  username?: string;
  avatar_url?: string;
  phone_number?: string;
  phone_country_code?: string;
  first_name?: string;
  last_name?: string;
  theme_settings?: string; // JSON string containing theme settings
  location_latitude?: number;
  location_longitude?: number;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  location_updated_at?: string;
  location_permission_granted?: boolean;
  location_auto_update?: boolean;
};

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: ProfileType | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, options?: { phone_number?: string, first_name?: string, last_name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileType>) => Promise<void>;
};
