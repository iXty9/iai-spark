
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
import { useEffect } from "react";
import { bootstrapMonitor } from "@/services/supabase/bootstrap-monitor";
import { checkPublicBootstrapConfig } from "@/services/supabase/connection-service";
import "./App.css";

function App() {
  // Initialize bootstrap process on app load
  useEffect(() => {
    // Try to bootstrap immediately
    checkPublicBootstrapConfig().catch(err => {
      console.error("Initial bootstrap attempt failed:", err);
    });
    
    // Start monitoring for recovery if needed
    bootstrapMonitor.start();
    
    // Clean up monitor on unmount
    return () => {
      bootstrapMonitor.stop();
    };
  }, []);

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
