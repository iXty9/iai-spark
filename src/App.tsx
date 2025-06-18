
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { initializationService } from '@/services/config/initialization-service';
import { useConfiguration } from '@/hooks/useConfiguration';
import { ConfigurationForm } from '@/components/config/ConfigurationForm';
import { ConfigurationStatus } from '@/components/config/ConfigurationStatus';
import { Loader2 } from 'lucide-react';

// Lazy load main components
const ChatContainer = React.lazy(() => import('@/components/chat/chat-container/ChatContainer'));
const Initialize = React.lazy(() => import('@/pages/Initialize'));

function App() {
  const { isInitialized, isLoading } = useConfiguration();
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Initialize the application
    initializationService.initialize();
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show configuration if not initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome</h1>
            <p className="text-muted-foreground">
              Please configure your application to get started
            </p>
          </div>
          
          <ConfigurationStatus onConfigureClick={() => setShowConfig(true)} />
          
          {showConfig && (
            <ConfigurationForm onSuccess={() => setShowConfig(false)} />
          )}
        </div>
        <Toaster />
      </div>
    );
  }

  // Main application
  return (
    <BrowserRouter>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<ChatContainer />} />
          <Route path="/initialize" element={<Initialize />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
