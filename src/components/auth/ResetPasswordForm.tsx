import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, AlertCircle, KeyRound, Loader2, Mail, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormField, FormItem, FormMessage, FormControl } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  sessionValid: boolean | null;
  onBack: () => void;
}

export const ResetPasswordForm = ({ sessionValid, onBack }: ResetPasswordFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // OTP fallback state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Show OTP input when session is invalid (link didn't work)
  useEffect(() => {
    if (sessionValid === false) {
      setShowOtpInput(true);
    }
  }, [sessionValid]);

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (!email || !otpCode) {
      setError('Please enter your email and the 6-digit code');
      return;
    }

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifyingOtp(true);
    setError(null);

    try {
      logger.info('Verifying OTP code', { module: 'reset-password', email });
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'recovery'
      });

      if (verifyError) {
        logger.error('OTP verification failed', verifyError, { module: 'reset-password' });
        setError(verifyError.message || 'Invalid or expired code. Please try again.');
        return;
      }

      if (data.session) {
        logger.info('OTP verification successful', { module: 'reset-password' });
        setOtpVerified(true);
        setShowOtpInput(false);
        toast({
          title: "Code Verified",
          description: "You can now set your new password.",
        });
      }
    } catch (err: any) {
      logger.error('OTP verification error', err, { module: 'reset-password' });
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

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

  // Show loading while parent is determining session validity
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

  // Show OTP input fallback when magic link didn't work
  if (showOtpInput && !otpVerified) {
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-0 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Hash className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Enter Verification Code</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the 6-digit code from your password reset email along with your email address.
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
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="otp-email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                6-Digit Code
              </Label>
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                onClick={handleVerifyOtp}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={isVerifyingOtp || !email || otpCode.length !== 6}
              >
                {isVerifyingOtp ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onBack}
                className="w-full h-11"
              >
                Back to Login
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Didn't receive a code?{' '}
              <button
                type="button"
                onClick={() => navigate('/auth?mode=forgot')}
                className="text-primary hover:underline"
              >
                Request a new one
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password reset form when session is valid or OTP was verified
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
