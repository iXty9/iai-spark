import { Routes, Route } from 'react-router-dom';
import { useAuthThemeSync } from '@/hooks/use-auth-theme-sync';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Initialize from '@/pages/Initialize';
import { ErrorPage } from '@/pages/ErrorPage';
import NotFound from '@/pages/NotFound';
import Reconnect from '@/pages/Reconnect';
import SupabaseAuth from '@/pages/SupabaseAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Inner app content that has access to auth context
 * This component uses the auth-theme sync hook to ensure theme system
 * stays synchronized with authentication state changes
 */
export const AppContent = () => {
  // Sync theme system with authentication changes
  useAuthThemeSync();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/supabase-auth" element={<SupabaseAuth />} />
      <Route path="/initialize" element={<Initialize />} />
      <Route path="/reconnect" element={<Reconnect />} />
      <Route path="/chat" element={<Index />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};