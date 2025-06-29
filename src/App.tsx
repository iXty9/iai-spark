
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { SeoProvider } from "@/components/providers/SeoProvider";
import { FastBootstrapProvider } from "@/components/providers/FastBootstrapProvider";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { ComponentErrorBoundary } from "@/components/error/ComponentErrorBoundary";
import { MobileSafariErrorBoundary } from "@/components/error/MobileSafariErrorBoundary";
import { FastHealthMonitor } from "@/components/system/FastHealthMonitor";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Initialize from "./pages/Initialize";
import Reconnect from "./pages/Reconnect";
import SupabaseAuth from "./pages/SupabaseAuth";
import NotFound from "./pages/NotFound";
import ErrorPage from "./pages/ErrorPage";

const queryClient = new QueryClient();

function App() {
  return (
    <GlobalErrorBoundary>
      <MobileSafariErrorBoundary>
        <SeoProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <FastBootstrapProvider>
                  <ComponentErrorBoundary>
                    <AuthProvider>
                      <WebSocketProvider>
                        <FastHealthMonitor />
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/initialize" element={<Initialize />} />
                          <Route path="/reconnect" element={<Reconnect />} />
                          <Route path="/supabase-auth" element={<SupabaseAuth />} />
                          <Route path="/error" element={<ErrorPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </WebSocketProvider>
                    </AuthProvider>
                  </ComponentErrorBoundary>
                </FastBootstrapProvider>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </SeoProvider>
      </MobileSafariErrorBoundary>
    </GlobalErrorBoundary>
  );
}

export default App;
