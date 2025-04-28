
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/services/admin/userRolesService';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { WebhookSettings } from '@/components/admin/WebhookSettings';
import { AppSettings } from '@/components/admin/AppSettings';
import { UserManagement } from '@/components/admin/UserManagement';
import { ArrowLeft } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don't have admin privileges to access this page.",
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to verify admin privileges.",
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, navigate, toast]);

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center h-screen">
        <div className="text-center">
          <p>Checking admin privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-2xl font-bold text-center">Admin Panel</h1>
            <div className="w-[72px]"></div>
          </div>

          <AdminTabs
            webhookContent={<WebhookSettings />}
            appSettingsContent={<AppSettings />}
            userManagementContent={<UserManagement />}
          />
        </div>
      </Card>
    </div>
  );
}
