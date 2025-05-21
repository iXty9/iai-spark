import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Auth } from './components/auth/CustomAuth';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Account } from './components/Account';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';
import { Initialize } from './components/Initialize';
import { Connection } from './components/Connection';
import { Profile } from './components/Profile';
import { withSupabase, getSupabaseClient } from './services/supabase/connection-service';
import { AuthRequired } from './components/AuthRequired';
import { AdminRequired } from './components/AdminRequired';
import { SiteConfigSetup } from './components/SiteConfigSetup';
import { SiteConfigRequired } from './components/SiteConfigRequired';
import { BootstrapScreen } from './components/BootstrapScreen';
import { useBootstrap, BootstrapState } from './hooks/useBootstrap';
import { logger } from './utils/logging';
import { eventBus, AppEvents } from './utils/event-bus';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const { state: bootstrapState, error: bootstrapError, handleRetry } = useBootstrap();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
    console.log('Avatar URL updated:', url);
  };

  // Initialize Supabase client
  useEffect(() => {
    const initClient = async () => {
      try {
        const client = await getSupabaseClient();
        setSupabaseClient(client);
        logger.info('Supabase client initialized', { module: 'app' });
      } catch (error) {
        logger.error('Failed to initialize Supabase client', error, { module: 'app' });
      }
    };
    
    // Only initialize the client if bootstrap is complete
    if (bootstrapState === BootstrapState.COMPLETE) {
      initClient();
    }
  }, [bootstrapState]);
  
  // Set up authentication listeners
  useEffect(() => {
    if (!supabaseClient) return;
    
    const checkAuth = async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        setSession(data.session);
        
        // Set up auth state change listener
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
          (_event: any, session: any) => {
            setSession(session);
          }
        );
        
        // Return cleanup function
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error('Auth error:', error, { module: 'app' });
      }
    };
    
    const authSubscription = checkAuth();
    
    // Cleanup function
    return () => {
      authSubscription.then((cleanup: any) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [supabaseClient]);

  // Check if app is initialized
  useEffect(() => {
    if (!supabaseClient || !session) return;
    
    const checkInit = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('app_settings')
          .select('value')
          .eq('key', 'is_initialized')
          .single();
        
        if (error) {
          logger.error('Error fetching initialization status', error, {
            module: 'app'
          });
          setIsInitialized(false);
        } else if (data && data.value === 'true') {
          setIsInitialized(true);
        } else {
          setIsInitialized(false);
        }
      } catch (e) {
        logger.error('Unexpected error checking initialization', e, {
          module: 'app'
        });
        setIsInitialized(false);
      }
    };
    
    checkInit();
  }, [session, supabaseClient]);

  // Event bus setup
  useEffect(() => {
    // Publish app mounted event
    eventBus.publish(AppEvents.APP_MOUNTED, {});
    
    // Cleanup on unmount
    return () => {
      eventBus.publish(AppEvents.APP_UNMOUNTED, {});
    };
  }, []);

  // Show bootstrap screen if bootstrap not complete
  if (bootstrapState !== BootstrapState.COMPLETE) {
    return <BootstrapScreen state={bootstrapState} error={bootstrapError} onRetry={handleRetry} />;
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
          path="/profile" 
          element={
            <AuthRequired>
              <SiteConfigRequired>
                <Profile session={session} onAvatarChange={handleAvatarChange} />
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
          element={<SiteConfigSetup />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
