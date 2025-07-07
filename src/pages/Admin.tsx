import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supaToast } from '@/services/supa-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { WebhookSettings } from '@/components/admin/webhooks/WebhookSettings';
import { AppSettings } from '@/components/admin/AppSettings';
import { UserManagement } from '@/components/admin/UserManagement';
import { SeoSettings } from '@/components/admin/SeoSettings';
import { ThemeSettings } from '@/components/admin/ThemeSettings';
import { AuthenticationSettings } from '@/components/admin/AuthenticationSettings';
import { PWASettings } from '@/components/admin/PWASettings';
import Environment from '@/components/admin/Environment';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('app-settings');
  
  // Check for tab parameter in URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tabParam = queryParams.get('tab');
    if (tabParam === 'users' || tabParam === 'webhooks' || tabParam === 'app-settings' || tabParam === 'environment' || tabParam === 'seo' || tabParam === 'theme' || tabParam === 'authentication' || tabParam === 'pwa') {
      setActiveTab(tabParam);
    }
  }, []);
  
  useEffect(() => {
    let isMounted = true;
    
    const checkAdmin = async () => {
      if (!user) {
        // Only redirect if component is still mounted
        if (isMounted) {
          setIsRedirecting(true);
          supaToast.error("Please sign in to access the admin panel.", {
            title: "Authentication Required"
          });
          navigate('/auth');
        }
        return;
      }

      try {
        const adminStatus = await checkIsAdmin(user.id);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            setIsRedirecting(true);
            supaToast.error("You don't have admin privileges to access this page.", {
              title: "Access Denied"
            });
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        
        // Only show toast and redirect if component is still mounted
        if (isMounted) {
          supaToast.error("Failed to verify admin privileges.", {
            title: "Error"
          });
          setIsRedirecting(true);
          navigate('/');
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAdmin();
    
    // Cleanup function to handle unmounting
    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const handleGoBack = () => {
    navigate('/');
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL parameter without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card className="bg-background/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-8 w-40" />
              <div className="w-[72px]"></div>
            </div>
            <Skeleton className="h-10 w-full mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If we're in the process of redirecting, show minimal UI
  if (isRedirecting) {
    return (
      <div className="container flex items-center justify-center h-screen">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  // If user is not admin and we're not already redirecting, show access denied
  if (!isAdmin) {
    return (
      <div className="container flex items-center justify-center h-screen">
        <Card className="p-6 text-center bg-background/80 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4">Access Denied</h2>
          <p className="mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-4 md:py-10 px-4">
      <Card className="bg-background/80 backdrop-blur-sm">
        <div className="p-4 md:p-6">
          {/* Mobile-optimized header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 -ml-2"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-lg md:text-2xl font-bold text-center">
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </h1>
            <div className="w-[60px] md:w-[72px]"></div>
          </div>

          <AdminTabs
            webhookContent={<WebhookSettings />}
            appSettingsContent={<AppSettings />}
            userManagementContent={<UserManagement />}
            environmentContent={<Environment />}
            seoContent={<SeoSettings />}
            themeContent={<ThemeSettings />}
            authenticationContent={<AuthenticationSettings />}
            pwaContent={<PWASettings />}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </Card>
    </div>
  );
}
