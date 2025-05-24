import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/AuthContext';
import { SystemSelfHealer } from '@/components/system/SystemSelfHealer';
import { InitializePage } from '@/pages/InitializePage';
import { ChatPage } from '@/pages/ChatPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { AdminRoutes } from '@/pages/admin/AdminRoutes';
import { SimpleBootstrapProvider } from '@/components/supabase/SimpleBootstrapProvider';

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <SimpleBootstrapProvider>
            <AuthProvider>
              <SystemSelfHealer />
              <Toaster />
              <Routes>
                <Route path="/initialize" element={<InitializePage />} />
                <Route path="/chat/:chatId?" element={<ChatPage />} />
                <Route path="/supabase-auth/callback" element={<AuthCallbackPage />} />
                <Route path="/auth/error" element={<ErrorPage />} />
                <Route path="/admin/*" element={<AdminRoutes />} />
                <Route path="*" element={<ChatPage />} />
              </Routes>
            </AuthProvider>
          </SimpleBootstrapProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      suspense: true,
    },
  },
});

export default App;
