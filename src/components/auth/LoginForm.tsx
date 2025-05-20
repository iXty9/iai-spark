
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { sanitizeInput } from '@/utils/security';
import { getConnectionInfo } from '@/services/supabase/client-provider';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const iconProps = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground";

const FIELD_CONFIG = [
  { name: 'email', label: 'Email', Icon: Mail, type: 'email', placeholder: 'your@email.com' },
  { name: 'password', label: 'Password', Icon: Lock, type: 'password' }
];

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const handleSubmit = async ({ email, password }: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);
    try {
      // Use the utility function from security.ts
      await signIn(sanitizeInput(email), password);
      navigate('/');
    } catch (error: any) {
      let message = 'Authentication failed';
      if (error?.message?.includes('Invalid login credentials')) message = 'Invalid email or password';
      else if (error?.message?.includes('network')) message = 'Network error - cannot connect to authentication service';
      else if (error?.message?.includes('timeout')) message = 'Connection timed out - check your network and try again';
      else if (error?.message) message = error.message;
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfig = () => {
    setIsResetting(true);
    try {
      Object.keys(localStorage)
        .filter(k => ['spark_supabase_config', 'sb-refresh-token', 'sb-access-token', 'supabase.auth.expires_at', 'supabase.auth.token'].includes(k)
          || k.includes('supabase') || k.startsWith('sb-'))
        .forEach(k => {
          try { localStorage.removeItem(k); }
          catch (e) { /* ignore */ }
        });
      setTimeout(() => {
        window.location.href = window.location.pathname + '?reset_config=true';
      }, 500);
    } catch (e) {
      setIsResetting(false);
    }
  };

  const connectionInfo = getConnectionInfo();

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
                  onClick={() => setShowDebug(v => !v)}
                >
                  {showDebug ? 'Hide debug info' : 'Show debug info'}
                </button>
                {showDebug && (
                  <div className="mt-2">
                    <pre className="overflow-auto max-h-32 p-2 bg-slate-900 text-white rounded text-xs">
                      {JSON.stringify(connectionInfo, null, 2)}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={handleResetConfig}
                      disabled={isResetting}
                    >
                      <RefreshCw className={`mr-1 h-3 w-3${isResetting ? ' animate-spin' : ''}`} />
                      {isResetting ? "Resetting..." : "Reset Connection Config"}
                    </Button>
                  </div>
                )}
              </div>
            </Alert>
          )}
          {FIELD_CONFIG.map(({ name, label, Icon, type, placeholder }) => (
            <FormField
              key={name}
              control={form.control}
              name={name as keyof LoginFormData}
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor={name}>{label}</Label>
                  <div className="relative">
                    <Icon className={iconProps} />
                    <FormControl>
                      <Input
                        id={name}
                        type={type}
                        placeholder={placeholder}
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
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
