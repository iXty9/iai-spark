
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import Admin from '@/pages/Admin';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProductionErrorBoundary } from '@/components/error/ProductionErrorBoundary';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UnifiedThemeProvider } from '@/hooks/use-unified-theme';

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  });

  return (
    <ProductionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnifiedThemeProvider>
          <AuthProvider clientReady={true}>
            <TooltipProvider>
              <Toaster />
              <WebSocketProvider>
                <Router>
                  <Routes>
                    <Route path="/*" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin" element={<Admin />} />
                  </Routes>
                </Router>
              </WebSocketProvider>
            </TooltipProvider>
          </AuthProvider>
        </UnifiedThemeProvider>
      </QueryClientProvider>
    </ProductionErrorBoundary>
  );
}

export default App;
