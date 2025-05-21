
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from 'react-router-dom';
// Import a custom auth UI component instead of the Supabase one
import { supabase } from './integrations/supabase/client';
import { Account } from './components/Account';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { Initialize } from './components/Initialize';
import { Connection } from './components/Connection';
import { Profile } from './components/Profile';
import { AuthRequired } from './components/AuthRequired';
import { AdminRequired } from './components/AdminRequired';
import { SiteConfigSetup } from './components/SiteConfigSetup';
import { SiteConfigRequired } from './components/SiteConfigRequired';
import { BootstrapScreen } from './components/BootstrapScreen';
import { useBootstrap } from './hooks/useBootstrap';
import { getEnvironmentInfo } from './config/supabase-config';
import { logger } from './utils/logging';
import { eventBus, AppEvents } from './utils/event-bus';

// Create a simple Auth component to replace the Supabase one
const Auth = ({
  supabaseClient,
  appearance,
  providers,
  redirectTo
}: {
  supabaseClient: any;
  appearance: any;
  providers: string[];
  redirectTo: string;
}) => {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl mb-4">Authentication</h2>
      <p className="mb-4">Please sign in or register to continue.</p>
      <div className="space-y-4">
        <button className="w-full p-2 bg-blue-500 text-white rounded" 
          onClick={() => supabaseClient.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } })}>
          Sign in with GitHub
        </button>
        <button className="w-full p-2 bg-red-500 text-white rounded"
          onClick={() => supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

// Define ProfileProps interface
interface ProfileProps {
  session: any;
  onAvatarChange: (url: string) => void;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);
  const { state: bootstrapState, error: bootstrapError } = useBootstrap();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
    console.log('Avatar URL updated:', url);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const checkInit = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'is_initialized')
          .single();

        if (error) {
          logger.error('Error fetching initialization status', error, { module: 'app' });
          setIsInitialized(false);
        } else if (data && data.value === 'true') {
          setIsInitialized(true);
        } else {
          setIsInitialized(false);
        }
      } catch (e) {
        logger.error('Unexpected error checking initialization', e, { module: 'app' });
        setIsInitialized(false);
      }
    };

    checkInit();
  }, [session]);

  useEffect(() => {
    // Publish app mounted event
    eventBus.publish(AppEvents.APP_MOUNTED, {});

    // Cleanup on unmount
    return () => {
      eventBus.publish(AppEvents.APP_UNMOUNTED, {});
    };
  }, []);

  // Compare bootstrapState as a string instead of enum
  if (bootstrapState !== "COMPLETE") {
    return <BootstrapScreen state={bootstrapState} error={bootstrapError} />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/supabase-auth"
          element={
            <div className="container" style={{ padding: '50px 0 100px 0' }}>
              {!session ? (
                <Auth
                  supabaseClient={supabase}
                  appearance={{ theme: 'dark' }}
                  providers={['github', 'google']}
                  redirectTo={`${window.location.origin}/profile`}
                />
              ) : (
                <Navigate to="/profile" />
              )}
            </div>
          }
        />
        <Route
          path="/initialize"
          element={
            <SiteConfigRequired>
              <Initialize />
            </SiteConfigRequired>
          }
        />
        <Route
          path="/admin/connection"
          element={
            <AdminRequired>
              <Connection />
            </AdminRequired>
          }
        />
        <Route
          path="/"
          element={
            <SiteConfigRequired>
              <Home />
            </SiteConfigRequired>
          }
        />
        <Route
          path="/account"
          element={
            <AuthRequired>
              <SiteConfigRequired>
                <Account session={session} />
              </SiteConfigRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRequired>
              <SiteConfigRequired>
                <AdminPanel />
              </SiteConfigRequired>
            </AdminRequired>
          }
        />
        <Route
          path="/setup"
          element={
            <SiteConfigSetup />
          }
        />
        <Route 
          path="/profile" 
          element={
            <AuthRequired>
              <Profile 
                session={session} 
                onAvatarChange={handleAvatarChange}
              />
            </AuthRequired>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
