
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SupabaseAuth from "./pages/SupabaseAuth";
import Initialize from "./pages/Initialize";
import { Toaster } from "@/components/ui/toaster";
import { BootstrapProvider } from "@/components/supabase/BootstrapProvider";
import { ThemeProvider } from "@/hooks/use-theme";
import "./App.css";

function App() {
  return (
    <Router>
      <BootstrapProvider>
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
      </BootstrapProvider>
    </Router>
  );
}

export default App;
