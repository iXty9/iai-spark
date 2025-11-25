import { useState } from 'react';
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

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

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
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
