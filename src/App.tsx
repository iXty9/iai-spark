
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SupabaseAuth from "./pages/SupabaseAuth";
import Initialize from "./pages/Initialize";
import { Toaster } from "@/components/ui/sonner";
import { BootstrapProvider } from "@/components/supabase/BootstrapProvider";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { bootstrapMonitor } from "@/services/supabase/bootstrap-monitor";
import { checkPublicBootstrapConfig } from "@/services/supabase/connection-service";
import { logger } from "@/utils/logging";
import "./App.css";

function App() {
  // State to track client initialization
  const [clientInitialized, setClientInitialized] = useState<boolean>(false);
  
  // Safe initialization - Handle with care to prevent recursion
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info("Starting app initialization process", { module: 'app-init' });
        
        // Try to check config without causing auth errors
        const hasConfig = await checkPublicBootstrapConfig().catch(err => {
          logger.error("Initial bootstrap check failed:", err, { module: 'app-init' });
          return false;
        });
        
        logger.info("Initial bootstrap check complete", { 
          hasConfig, 
          module: 'app-init' 
        });
        
        setClientInitialized(true);
        
        // Only start monitor if we've safely initialized
        if (hasConfig) {
          bootstrapMonitor.start();
        } else {
          logger.info("Bootstrap monitor not started - no configuration found", {
            module: 'app-init'
          });
        }
      } catch (err) {
        // Log error but continue rendering the app
        logger.error("Error during app initialization:", err, { module: 'app-init' });
        setClientInitialized(true); // Still mark as initialized to allow rendering
      }
    };
    
    initializeApp();
    
    // Clean up monitor on unmount
    return () => {
      bootstrapMonitor.stop();
    };
  }, []);

  // Render simple loading state while client initializes
  if (!clientInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <BootstrapProvider>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/supabase-auth" element={<SupabaseAuth />} />
              <Route path="/initialize" element={<Initialize />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </BootstrapProvider>
    </Router>
  );
}

export default App;
