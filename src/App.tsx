
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./hooks/use-theme";
import { SimpleBootstrapProvider } from "./components/providers/SimpleBootstrapProvider";
import { SystemSelfHealer } from "./components/system/SystemSelfHealer";
import { DebugPanel } from "./components/debug/DebugPanel";
import { useDebugMode } from "./hooks/useDebugMode";
import { useEffect } from "react";
import { selfHealingBootstrap } from "./services/bootstrap/self-healing-bootstrap";
import { logger } from "./utils/logging";
import Index from "./pages/Index";
import Initialize from "./pages/Initialize";
import SupabaseAuth from "./pages/SupabaseAuth";

const queryClient = new QueryClient();

function AppContent() {
  const { isDebugMode, showDebugPanel, toggleDebugPanel } = useDebugMode();

  useEffect(() => {
    // Start self-healing bootstrap system
    selfHealingBootstrap.startSelfHealing();
    
    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      logger.error('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, { module: 'global-error-handler' });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', event.reason, { 
        module: 'global-error-handler' 
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      selfHealingBootstrap.stopSelfHealing();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/initialize" element={<Initialize />} />
        <Route path="/supabase-auth/callback" element={<SupabaseAuth />} />
      </Routes>
      
      <SystemSelfHealer />
      
      {/* Debug Panel */}
      {(isDebugMode || showDebugPanel) && (
        <DebugPanel 
          isOpen={showDebugPanel} 
          onClose={() => toggleDebugPanel()} 
        />
      )}
      
      {/* Debug Mode Indicator */}
      {isDebugMode && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-medium">
            DEBUG MODE
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <SimpleBootstrapProvider>
            <AuthProvider>
              <ThemeProvider>
                <AppContent />
                <Toaster />
                <Sonner />
              </ThemeProvider>
            </AuthProvider>
          </SimpleBootstrapProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
