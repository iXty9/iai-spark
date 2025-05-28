
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/hooks/use-theme';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Initialize from '@/pages/Initialize';
import { ChatPage } from '@/pages/ChatPage';
import { ErrorPage } from '@/pages/ErrorPage';
import NotFound from '@/pages/NotFound';
import Reconnect from '@/pages/Reconnect';
import { InitializePage } from '@/pages/InitializePage';
import SupabaseAuth from '@/pages/SupabaseAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';
import { FastBootstrapProvider } from '@/components/providers/FastBootstrapProvider';
import { FastHealthMonitor } from '@/components/system/FastHealthMonitor';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Wait for theme system to be ready before rendering theme-dependent components
  useEffect(() => {
    // Add a small delay to ensure all providers are properly initialized
    const timer = setTimeout(() => {
      setIsThemeReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <FastBootstrapProvider>
          <Router>
            <AuthProvider>
              <ThemeProvider>
                <div className="min-h-screen bg-background text-foreground">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/supabase-auth" element={<SupabaseAuth />} />
                    <Route path="/initialize" element={<Initialize />} />
                    <Route path="/init" element={<InitializePage />} />
                    <Route path="/reconnect" element={<Reconnect />} />
                    <Route path="/chat" element={<ChatPage />} />
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
                  
                  {/* Only render theme-dependent components after theme is ready */}
                  {isThemeReady && (
                    <>
                      <Toaster />
                      <FastHealthMonitor />
                    </>
                  )}
                </div>
              </ThemeProvider>
            </AuthProvider>
          </Router>
        </FastBootstrapProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
