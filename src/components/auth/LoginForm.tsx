import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, ArrowLeft, AlertCircle, User, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { useDevMode } from '@/store/use-dev-mode';
import { useAuthSettings } from '@/hooks/admin/useAuthSettings';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const iconProps = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground";

const FIELD_CONFIG = [
  { name: 'email', label: 'Email', Icon: Mail, type: 'email', placeholder: 'your@email.com' },
  { name: 'password', label: 'Password', Icon: Lock, type: 'password', placeholder: 'Enter your password' }
];

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isDevMode } = useDevMode();
  const { authSettings } = useAuthSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const handleSubmit = async ({ email, password }: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await signIn(DOMPurify.sanitize(email), password);
      navigate('/');
    } catch (error: any) {
      // Clean, user-friendly error messages for production
      let message = 'Authentication failed. Please check your credentials and try again.';
      if (error?.message?.includes('Invalid login credentials')) {
        message = 'Invalid email or password.';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error?.message?.includes('timeout')) {
        message = 'Connection timed out. Please try again.';
      }
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Development mode only: Allow debug info and configuration reset
  const isDebugAllowed = process.env.NODE_ENV === 'development' && isDevMode;

  return (
    <div className="space-y-6">
      {/* Login Header */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{authSettings.loginTitle}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {authSettings.loginDescription}
          </p>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {serverError && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sign In Failed</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
          {isDebugAllowed && (
            <div className="mt-2 text-xs">
              <button
                type="button"
                className="text-primary underline hover:no-underline transition-all"
                onClick={() => setShowDebug(v => !v)}
              >
                {showDebug ? 'Hide debug info' : 'Show debug info'}
              </button>
              {showDebug && (
                <Card className="mt-2 bg-muted/50">
                  <CardContent className="p-3">
                    <div className="text-xs font-mono space-y-1 text-muted-foreground">
                      <div>Environment: {process.env.NODE_ENV}</div>
                      <div>Hostname: {window.location.hostname}</div>
                      <div>Dev Mode: {isDevMode ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </Alert>
      )}

      {/* Login Form */}
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">Account Credentials</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {FIELD_CONFIG.map(({ name, label, Icon, type, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof LoginFormData}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor={name} className="text-sm font-medium text-foreground">
                        {label}
                      </Label>
                      <div className="relative">
                        <Icon className={iconProps} />
                        <FormControl>
                          <Input
                            id={name}
                            type={type}
                            placeholder={placeholder}
                            className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              ))}

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-border/50 hover:bg-muted/50 transition-all duration-200"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};