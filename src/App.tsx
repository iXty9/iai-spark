import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { SupaThemeProvider } from '@/contexts/SupaThemeContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { NotificationPermissionManager } from '@/components/notifications/NotificationPermissionManager';
import { PWAManager } from '@/components/pwa/PWAManager';
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
import { coordinatedInitService } from '@/services/initialization/coordinated-init-service';
import { logger } from '@/utils/logging';
import { applySiteTitle } from '@/utils/site-utils';
import './App.css';
import { globalCleanupService } from '@/services/global/global-cleanup-service';

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
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    // Initialize global cleanup service
    globalCleanupService.initialize();
    
    return () => {
      // Cleanup will be handled automatically by the service
      // but we can also trigger it manually here if needed
    };
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('Starting app initialization', { module: 'app' });
        
        const initResult = await coordinatedInitService.initialize();
        
        if (initResult.isComplete) {
          setClientReady(true);
          logger.info('App initialized successfully', { module: 'app' });
          
          // Apply site title after successful initialization
          try {
            await applySiteTitle();
          } catch (error) {
            logger.warn('Failed to apply site title', { module: 'app' });
          }
        } else if (initResult.error) {
          throw new Error(initResult.error);
        }
        
        setIsAppReady(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('App initialization failed', error, { module: 'app' });
        setInitError(errorMessage);
        setIsAppReady(true); // Still show the app so user can access setup
      }
    };

    initializeApp();
  }, []);

  if (!isAppReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#dd3333' }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProductionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider clientReady={clientReady}>
            <WebSocketProvider>
              <SupaThemeProvider>
                <LocationProvider>
                <NotificationPermissionManager />
                <PWAManager />
                <div className="min-h-screen text-foreground">
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
                  
                  {/* Unified SupaToast system */}
                  <Toaster />
                  
                  {/* Only show debug in development */}
                  {process.env.NODE_ENV === 'development' && initError && (
                    <div className="fixed bottom-4 right-4 bg-red-500 text-white p-2 text-xs rounded z-50 max-w-xs">
                      <div className="font-bold">Init Error:</div>
                      <div>{initError}</div>
                    </div>
                  )}
                </div>
                </LocationProvider>
              </SupaThemeProvider>
            </WebSocketProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ProductionErrorBoundary>
  );
}

export default App;
