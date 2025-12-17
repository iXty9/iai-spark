import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { resetPassword } from '@/contexts/auth/authOperations';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type ResetFormData = z.infer<typeof resetSchema>;

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' }
  });

  const handleSubmit = async ({ email }: ResetFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(DOMPurify.sanitize(email));
      setIsSuccess(true);
    } catch (error: any) {
      let message = 'Failed to send password reset email. Please try again.';
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Check Your Email</h3>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">
              We've sent you an email with instructions to reset your password. Please check your inbox and follow the link provided.
            </p>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 border-border/50 hover:bg-muted/50 transition-all duration-200"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
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
            <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            Enter your email address and we'll send you a link to reset your password.
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
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
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
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-border/50 hover:bg-muted/50 transition-all duration-200"
                  onClick={onBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
