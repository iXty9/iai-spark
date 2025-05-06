
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/use-theme';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Admin from '@/pages/Admin';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import Initialize from '@/pages/Initialize';
import { DevModeProvider } from '@/store/use-dev-mode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemSelfHealer } from '@/components/system/SystemSelfHealer';

import './App.css';
import './styles/theme.css';
import './styles/chat-theme.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DevModeProvider>
        <ThemeProvider>
          <AuthProvider>
            {/* Self-healing system component */}
            <SystemSelfHealer />
            
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/initialize" element={<Initialize />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </DevModeProvider>
    </QueryClientProvider>
  );
}

export default App;
