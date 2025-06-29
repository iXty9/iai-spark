
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ThemeProvider } from '@/hooks/use-theme';
import { NotificationPermissionManager } from '@/components/notifications/NotificationPermissionManager';
import { FastBootstrapProvider } from '@/components/providers/FastBootstrapProvider';
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
import { ProductionErrorBoundary } from '@/components/error/ProductionErrorBoundary';
import { globalCleanupService } from '@/services/global/global-cleanup-service';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize global cleanup service
    globalCleanupService.initialize();
    
    return () => {
      // Cleanup will be handled automatically by the service
      // but we can also trigger it manually here if needed
    };
  }, []);

  return (
    <ProductionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider clientReady={true}>
            <WebSocketProvider>
              <ThemeProvider>
                <NotificationPermissionManager />
                <div className="min-h-screen text-foreground">
                  <Routes>
                    {/* Special routes that don't need FastBootstrapProvider */}
                    <Route path="/initialize" element={<Initialize />} />
                    <Route path="/error" element={<ErrorPage />} />
                    
                    {/* All other routes wrapped with FastBootstrapProvider */}
                    <Route path="/" element={
                      <FastBootstrapProvider>
                        <Index />
                      </FastBootstrapProvider>
                    } />
                    <Route path="/auth" element={
                      <FastBootstrapProvider>
                        <Auth />
                      </FastBootstrapProvider>
                    } />
                    <Route path="/supabase-auth" element={
                      <FastBootstrapProvider>
                        <SupabaseAuth />
                      </FastBootstrapProvider>
                    } />
                    <Route path="/reconnect" element={
                      <FastBootstrapProvider>
                        <Reconnect />
                      </FastBootstrapProvider>
                    } />
                    <Route path="/chat" element={
                      <FastBootstrapProvider>
                        <Index />
                      </FastBootstrapProvider>
                    } />
                    <Route path="/settings" element={
                      <FastBootstrapProvider>
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      </FastBootstrapProvider>
                    } />
                    <Route path="/profile" element={
                      <FastBootstrapProvider>
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      </FastBootstrapProvider>
                    } />
                    <Route path="/admin" element={
                      <FastBootstrapProvider>
                        <ProtectedRoute>
                          <Admin />
                        </ProtectedRoute>
                      </FastBootstrapProvider>
                    } />
                    
                    {/* 404 handler - must be last */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  
                  <Toaster />
                </div>
              </ThemeProvider>
            </WebSocketProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ProductionErrorBoundary>
  );
}

export default App;
