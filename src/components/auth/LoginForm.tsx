
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { getStoredConfig } from '@/config/supabase-config';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);
    
    try {
      // Sanitize the email to prevent XSS
      const sanitizedEmail = DOMPurify.sanitize(data.email);
      
      await signIn(sanitizedEmail, data.password);
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      setServerError(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Get connection info for debugging
  const getConnectionInfo = () => {
    try {
      const storedConfig = getStoredConfig();
      const connectionId = localStorage.getItem('supabase_connection_id') || 'unknown';
      const hostname = window.location.hostname;
      
      return {
        url: storedConfig?.url ? storedConfig.url.split('//')[1] : 'No stored config',
        connectionId,
        hostname,
        isDev: process.env.NODE_ENV === 'development',
      };
    } catch (e) {
      return { error: 'Could not retrieve connection info' };
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
              <div className="mt-2 text-xs">
                <button 
                  type="button" 
                  className="text-primary underline"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? 'Hide debug info' : 'Show debug info'}
                </button>
                {showDebug && (
                  <pre className="mt-2 overflow-auto max-h-32 p-2 bg-slate-900 text-white rounded text-xs">
                    {JSON.stringify(getConnectionInfo(), null, 2)}
                  </pre>
                )}
              </div>
            </Alert>
          )}
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input 
                      id="password" 
                      type="password"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            type="submit" 
            className="w-full bg-[#ea384c] hover:bg-[#dd3333]"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
