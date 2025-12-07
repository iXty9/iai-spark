import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthThemeSync } from '@/hooks/use-auth-theme-sync';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import AdminUserProfile from '@/pages/AdminUserProfile';
import Initialize from '@/pages/Initialize';
import { ErrorPage } from '@/pages/ErrorPage';
import NotFound from '@/pages/NotFound';
import Reconnect from '@/pages/Reconnect';
import SupabaseAuth from '@/pages/SupabaseAuth';
import OAuth from '@/pages/OAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

/**
 * Inner app content that has access to auth context
 * This component uses the auth-theme sync hook to ensure theme system
 * stays synchronized with authentication state changes
 */
export const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Sync theme system with authentication changes
  useAuthThemeSync();

  // Handle URL-encoded paths (Lovable dev workspace quirk where ? becomes %3F)
  useEffect(() => {
    const { pathname, search, hash } = location;
    
    // Check if pathname contains encoded query string (e.g., %3F = ?, %26 = &)
    if (pathname.includes('%3F') || pathname.includes('%26')) {
      const decodedPath = decodeURIComponent(pathname);
      const newUrl = decodedPath + search + hash;
      navigate(newUrl, { replace: true });
    }
  }, [location.pathname, navigate]);

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
      <Route
        path="/admin/user/:userId"
        element={
          <ProtectedRoute>
            <AdminUserProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/oauth" element={<OAuth />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};