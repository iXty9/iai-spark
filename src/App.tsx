
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { hasStoredConfig, getStoredConfig } from "@/config/supabase-config";
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
    // Check if we have a stored Supabase configuration
    const initialized = hasStoredConfig();
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
      </AuthProvider>
    </AppInitializer>
  </QueryClientProvider>
);

// Component to check initialization and redirect if needed
const RequireInitialization = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState<boolean | null>(null);

  useEffect(() => {
    const initialized = hasStoredConfig();
    setIsReady(initialized);
  }, []);

  if (isReady === null) {
    // Still checking initialization status
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isReady) {
    // Not initialized, redirect to initialization page
    return <Navigate to="/initialize" replace />;
  }
  
  // Initialized, render children
  return <>{children}</>;
};

export default App;
