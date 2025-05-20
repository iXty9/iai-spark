
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
import { logger } from "@/utils/logging";
import { eventBus, AppEvents } from "@/utils/event-bus";
import { bootstrapManager } from "@/services/supabase/bootstrap/bootstrap-manager";
import { getSupabaseClient } from "@/services/supabase/client-provider";
import "./App.css";

function App() {
  // State to track client initialization
  const [clientInitialized, setClientInitialized] = useState<boolean>(false);
  
  // Initialize app when mounted
  useEffect(() => {
    const initializeApp = async () => {
      logger.info("Starting app initialization process", { module: 'app-init' });
      
      // Signal app mounted
      eventBus.publish(AppEvents.APP_MOUNTED, {
        timestamp: new Date().toISOString()
      });
      
      try {
        // Start bootstrap process
        bootstrapManager.startBootstrap();
        
        // Listen for bootstrap completion
        const bootstrapSubscription = eventBus.subscribe(
          AppEvents.BOOTSTRAP_COMPLETED,
          () => {
            logger.info("Bootstrap process completed", { module: 'app-init' });
            
            // Initialize client
            getSupabaseClient().then(() => {
              setClientInitialized(true);
            }).catch(err => {
              logger.error("Error initializing client:", err, { module: 'app-init' });
              setClientInitialized(true); // Still mark as initialized to allow rendering
            });
          }
        );
        
        // Listen for bootstrap failure - still render app with error state
        const bootstrapFailedSubscription = eventBus.subscribe(
          AppEvents.BOOTSTRAP_FAILED,
          () => {
            logger.warn("Bootstrap process failed, but still rendering app", { module: 'app-init' });
            setClientInitialized(true);
          }
        );
        
        // Also set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          logger.warn("Bootstrap timed out, rendering app anyway", { module: 'app-init' });
          setClientInitialized(true);
        }, 5000);
        
        // Clean up
        return () => {
          bootstrapSubscription.unsubscribe();
          bootstrapFailedSubscription.unsubscribe();
          clearTimeout(timeoutId);
          
          // Signal app unmount
          eventBus.publish(AppEvents.APP_UNMOUNTED, {
            timestamp: new Date().toISOString()
          });
        };
      } catch (err) {
        // Log error but continue rendering the app
        logger.error("Error during app initialization:", err, { module: 'app-init' });
        setClientInitialized(true); // Still mark as initialized to allow rendering
      }
    };
    
    initializeApp();
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
