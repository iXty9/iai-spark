import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './integrations/supabase/client';
import { Account } from './components/Account';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { Initialize } from './components/Initialize';
import { Connection } from './components/Connection';
import { Profile } from './components/Profile';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { AuthRequired } from './components/AuthRequired';
import { AdminRequired } from './components/AdminRequired';
import { SiteConfigSetup } from './components/SiteConfigSetup';
import { SiteConfigRequired } from './components/SiteConfigRequired';
import { BootstrapScreen } from './components/BootstrapScreen';
import { useBootstrap } from './hooks/useBootstrap';
import { getEnvironmentInfo } from './config/supabase-config';
import { logger } from './utils/logging';
import { eventBus, AppEvents } from './utils/event-bus';

// Add Profile props interface
interface ProfileProps {
  session: any;
  onAvatarChange: (url: string) => void;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState(null);
  const supabaseClient = useSupabaseClient();
  const { state: bootstrapState, error: bootstrapError } = useBootstrap();

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, [supabaseClient]);

  useEffect(() => {
    const checkInit = async () => {
      try {
        const { data, error } = await supabaseClient
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
  }, [session, supabaseClient]);

  useEffect(() => {
    // Publish app mounted event
    eventBus.publish(AppEvents.APP_MOUNTED, {});

    // Cleanup on unmount
    return () => {
      eventBus.publish(AppEvents.APP_UNMOUNTED, {});
    };
  }, []);

  if (bootstrapState !== 'COMPLETE') {
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
                  supabaseClient={supabaseClient}
                  appearance={{ theme: ThemeSupa }}
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
                onAvatarChange={(url) => console.log('Avatar updated:', url)}
              />
            </AuthRequired>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
