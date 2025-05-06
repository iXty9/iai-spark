
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { hasStoredConfig, getStoredConfig, forceDefaultConfig, isDevelopment, saveConfig, clearConfig } from "@/config/supabase-config";
import { resetSupabaseClient } from "@/services/supabase/connection-service";
import { logger } from "@/utils/logging";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Initialize from "./pages/Initialize";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App initializer to check if app needs setup
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check URL parameters for debug options
    const urlParams = new URLSearchParams(window.location.search);
    const resetConfig = urlParams.get('reset_config') === 'true';
    const forceInit = urlParams.get('force_init') === 'true';
    
    if (resetConfig) {
      // For debugging: clear config, reset client and reload with force_init parameter
      clearConfig(); // This now also resets the client
      window.location.href = window.location.pathname + '?force_init=true'; // Reload with force_init
      return;
    }
    
    // Log the current hostname and development status
    logger.info(`Current hostname: ${window.location.hostname}, isDevelopment: ${isDevelopment()}`, {
      module: 'initialization'
    });
    
    // Get stored config to check if we need to initialize
    // Only do this if not forcing initialization
    if (forceInit) {
      setIsInitialized(false);
      return;
    }
    
    const config = getStoredConfig();
    const initialized = hasStoredConfig();
    
    logger.info(`Initialization check: hasStoredConfig=${initialized}, config=${config ? 'exists' : 'null'}, forceInit=${forceInit}`, {
      module: 'initialization'
    });
    
    setIsInitialized(initialized);
  }, []);
  
  // Show loading state while checking initialization
  if (isInitialized === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppInitializer>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Add initialize route */}
                <Route path="/initialize" element={<Initialize />} />
                
                {/* Routes that require initialization */}
                <Route path="/" element={
                  <RequireInitialization>
                    <Index />
                  </RequireInitialization>
                } />
                <Route path="/auth" element={
                  <RequireInitialization>
                    <Auth />
                  </RequireInitialization>
                } />
                <Route path="/profile" element={
                  <RequireInitialization>
                    <Profile />
                  </RequireInitialization>
                } />
                <Route path="/settings" element={
                  <RequireInitialization>
                    <Settings />
                  </RequireInitialization>
                } />
                <Route path="/admin" element={
                  <RequireInitialization>
                    <Admin />
                  </RequireInitialization>
                } />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </AppInitializer>
  </QueryClientProvider>
);

// Component to check initialization and redirect if needed
const RequireInitialization = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState<boolean | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const initialized = hasStoredConfig();
    const isDev = isDevelopment();
    
    // Check for force_init parameter - if present, redirect to initialize
    const urlParams = new URLSearchParams(window.location.search);
    const forceInit = urlParams.get('force_init') === 'true';
    
    if (forceInit) {
      setIsReady(false);
      return;
    }
    
    // Log detailed initialization status
    logger.info(`RequireInitialization check - hostname: ${hostname}, initialized: ${initialized}, isDevelopment: ${isDev}`, {
      module: 'initialization'
    });
    
    // Special case for custom domains in production
    if (!initialized && !isDev && hostname !== 'localhost' && 
        !hostname.includes('lovable.dev') && !hostname.includes('lovable.app')) {
      logger.info(`Custom domain detected (${hostname}), attempting to use default config`, {
        module: 'initialization'
      });
      const config = getStoredConfig();
      
      if (!config) {
        // For custom domains without config, try to force a default config
        logger.info('No config found for custom domain, forcing default config', {
          module: 'initialization'
        });
        const success = forceDefaultConfig();
        setIsReady(success);
        return;
      }
    }
    
    // If we're in development and not initialized, force default config
    if (!initialized && isDev) {
      logger.info('In development environment, attempting to force default config', {
        module: 'initialization'
      });
      const success = forceDefaultConfig();
      setIsReady(success);
    } else {
      setIsReady(initialized);
    }
  }, []);

  if (isReady === null) {
    // Still checking initialization status
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isReady) {
    // Not initialized, redirect to initialization page
    return <Navigate to="/initialize?force_init=true" replace />;
  }
  
  // Initialized, render children
  return <>{children}</>;
};

export default App;
