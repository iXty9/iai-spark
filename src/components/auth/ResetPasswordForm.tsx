import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Event-driven session detection for password recovery
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;
    
    // Subscribe to auth state changes - waits for Supabase to signal session ready
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        logger.info('Recovery session established via event', { 
          module: 'reset-password',
          event 
        });
        setSessionValid(true);
        clearTimeout(timeoutId);
      }
    });
    
    // Also check if session already exists (in case event fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;
      
      if (session) {
        logger.info('Existing recovery session found', { module: 'reset-password' });
        setSessionValid(true);
        clearTimeout(timeoutId);
      }
    });
    
    // Fallback timeout - 15 seconds max wait for slow networks
    timeoutId = setTimeout(() => {
      if (isSubscribed && sessionValid === null) {
        logger.warn('Recovery session timeout after 15s', { module: 'reset-password' });
        setSessionValid(false);
        setError('Your password reset link has expired or is invalid. Please request a new one.');
      }
    }, 15000);
    
    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async ({ password }: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        logger.error('Password update error', error, { module: 'reset-password' });
        throw error;
      }
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      
      // Redirect to home after successful password reset
      navigate('/');
    } catch (error: any) {
      let message = 'Failed to update password. Please try again.';
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error?.message) {
        // Show actual Supabase error for better debugging
        message = error.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while validating session
  if (sessionValid === null) {
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-0 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show expired link message with option to request new one
  if (sessionValid === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Link Expired</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Card className="glass-panel border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Password reset links expire after a short time for security reasons.
            </p>
            <Button
              onClick={() => navigate('/auth?mode=forgot')}
              className="w-full"
              variant="outline"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Set New Password</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your new password below. Make sure it's at least 6 characters long.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="glass-panel border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter new password"
                          className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm new password"
                          className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
