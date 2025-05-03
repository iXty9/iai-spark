
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

// Brute force protection - track failed login attempts
const loginAttempts = {
  count: 0,
  lastAttemptTime: 0,
  ipAddress: '',
  reset() {
    this.count = 0;
    this.lastAttemptTime = 0;
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
    
    // Reset login attempts counter when component mounts
    loginAttempts.reset();
    
    // Optional: Get approximate user location based on IP for logging
    const fetchClientInfo = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        loginAttempts.ipAddress = data.ip;
      } catch (error) {
        // Non-critical, just fail silently
        console.log('Could not get IP info');
      }
    };
    
    if (process.env.NODE_ENV === 'production') {
      fetchClientInfo();
    }
    
  }, [user, navigate]);
  
  // Use sessionStorage to remember the last active tab
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('authTab') || 'login';
    }
    return 'login';
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authTab', value);
    }
  };

  return (
    <AuthCard>
      <Alert className="mb-4 border-primary/20 bg-primary/10">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          This site uses secure authentication. Make sure you're on the correct domain.
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        
        <TabsContent value="register">
          <RegisterForm />
        </TabsContent>
      </Tabs>
    </AuthCard>
  );
};

export default Auth;
