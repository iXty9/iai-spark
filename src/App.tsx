
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./hooks/use-theme";
import { ProductionBootstrapProvider } from "./components/providers/ProductionBootstrapProvider";
import { ProductionErrorBoundary } from "./components/error/ProductionErrorBoundary";
import { ProductionHealthMonitor } from "./components/system/ProductionHealthMonitor";
import { useDebugMode } from "./hooks/useDebugMode";
import { useEffect } from "react";
import { productionBootstrap } from "./services/bootstrap/production-bootstrap";
import { logger } from "./utils/logging";
import Index from "./pages/Index";
import Initialize from "./pages/Initialize";
import Auth from "./pages/Auth";
import SupabaseAuth from "./pages/SupabaseAuth";

const queryClient = new QueryClient();

function AppContent() {
  const { isDebugMode, showDebugPanel, toggleDebugPanel } = useDebugMode();

  useEffect(() => {
    // Start production bootstrap system
    productionBootstrap.initialize();
    
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
      productionBootstrap.cleanup();
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ProductionErrorBoundary>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/initialize" element={<Initialize />} />
          <Route path="/supabase-auth/callback" element={<SupabaseAuth />} />
        </Routes>
        
        <ProductionHealthMonitor />
        
        {/* Debug Panel */}
        {(isDebugMode || showDebugPanel) && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className="bg-black/90 text-white p-4 rounded-lg text-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Debug Panel</span>
                <button 
                  onClick={() => toggleDebugPanel()}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
              <div>Debug mode active</div>
            </div>
          </div>
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
    </ProductionErrorBoundary>
  );
}

function App() {
  return (
    <ProductionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <ProductionBootstrapProvider>
              <AuthProvider>
                <ThemeProvider>
                  <AppContent />
                  <Toaster />
                  <Sonner />
                </ThemeProvider>
              </AuthProvider>
            </ProductionBootstrapProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ProductionErrorBoundary>
  );
}

export default App;
