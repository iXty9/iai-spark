import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, AlertCircle, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onBack: () => void;
}

/**
 * Simple password reset form using updateUser.
 * 
 * How it works:
 * 1. User clicks reset link from email → Supabase /verify validates token server-side
 * 2. Supabase establishes recovery session and redirects to ixty.ai/auth?mode=reset#
 * 3. This form immediately shows (no loading, no session detection)
 * 4. User enters new password and submits
 * 5. updateUser() is called - if session exists, it succeeds; if not, it fails
 * 6. Success → redirect to login; Error → show friendly message
 * 
 * This does NOT depend on URL hash tokens or auth events - the recovery session
 * was established by Supabase's server-side verification before the redirect.
 */
export const ResetPasswordForm = ({ onBack }: ResetPasswordFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // DEBUG: Log all browser state on mount to diagnose session issues
  // ============================================
  useEffect(() => {
    console.log('[RESET DEBUG] ResetPasswordForm mounted - capturing browser state');
    
    // 1. Log current URL state
    console.log('[RESET DEBUG] window.location:', {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      hashLength: window.location.hash.length,
    });
    
    // 2. Log all cookies visible to JS
    console.log('[RESET DEBUG] document.cookie:', document.cookie || '(empty)');
    
    // 3. Log all Supabase-related localStorage keys
    console.log('[RESET DEBUG] Scanning localStorage for sb-* keys...');
    let foundAuthTokens = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('sb-')) {
        foundAuthTokens++;
        try {
          const value = localStorage.getItem(key);
          const parsed = JSON.parse(value || '{}');
          console.log('[RESET DEBUG] localStorage key:', key, {
            hasAccessToken: !!parsed?.access_token,
            hasRefreshToken: !!parsed?.refresh_token,
            expiresAt: parsed?.expires_at,
            expiresIn: parsed?.expires_in,
            tokenType: parsed?.token_type,
            userEmail: parsed?.user?.email,
            userId: parsed?.user?.id,
          });
        } catch {
          console.log('[RESET DEBUG] localStorage key (raw):', key, localStorage.getItem(key)?.substring(0, 100));
        }
      }
    }
    if (foundAuthTokens === 0) {
      console.log('[RESET DEBUG] NO Supabase auth tokens found in localStorage!');
    }
    
    // 4. Check current Supabase session
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      console.log('[RESET DEBUG] supabase.auth.getSession() result:', {
        hasSession: !!data?.session,
        userId: data?.session?.user?.id,
        userEmail: data?.session?.user?.email,
        expiresAt: data?.session?.expires_at,
        error: sessionError?.message,
      });
    });
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const handleSubmit = async ({ password }: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    
    console.log('[RESET DEBUG] handleSubmit called - about to call updateUser');
    
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      
      // ============================================
      // DEBUG: Log the EXACT response from updateUser
      // ============================================
      console.log('[RESET DEBUG] updateUser result:', {
        success: !updateError,
        data: data ? {
          hasUser: !!data.user,
          userId: data.user?.id,
          userEmail: data.user?.email,
        } : null,
        error: updateError ? {
          message: updateError.message,
          status: (updateError as any).status,
          code: (updateError as any).code,
          name: updateError.name,
          // Log the full error object for debugging
          fullError: JSON.stringify(updateError, null, 2),
        } : null,
      });
      
      if (updateError) {
        console.error('[RESET DEBUG] Password update FAILED:', updateError);
        
        // Handle specific error types
        const errorMsg = updateError.message?.toLowerCase() || '';
        if (errorMsg.includes('session') || errorMsg.includes('expired') || errorMsg.includes('invalid') || errorMsg.includes('not logged in')) {
          setError('This reset link has expired or is invalid. Please request a new password reset.');
        } else {
          setError(updateError.message || 'Failed to update password. Please try again.');
        }
        return;
      }
      
      // Success!
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      // User already has valid session from recovery flow - take them to the app
      navigate('/', { replace: true });
      
    } catch (err: any) {
      console.error('Password update exception:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-0 shadow-sm bg-background/80">
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
          <AlertDescription>
            {error}
            {error.includes('expired') && (
              <button
                type="button"
                onClick={() => navigate('/auth?mode=forgot')}
                className="block mt-2 text-sm underline hover:no-underline"
              >
                Request a new password reset
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass-panel border-0 shadow-sm bg-background/80">
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

              <div className="pt-2 space-y-3">
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="w-full h-11"
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
