import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { PhoneInput } from '@/components/ui/phone-input';
import { UnsavedChangesDialog } from '@/components/profile/UnsavedChangesDialog';
import { useAdminProfileForm } from '@/hooks/admin/useAdminProfileForm';
import { formatUserDisplayName } from '@/services/admin/adminProfileService';
import { useState, useEffect } from 'react';

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const {
    form,
    profile,
    loading,
    isSubmitting,
    uploadingAvatar,
    isDirty,
    onSubmit,
    uploadAvatarFile,
  } = useAdminProfileForm(userId || '');

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty) {
      setPendingNavigation('/admin?tab=users');
    } else {
      navigate('/admin?tab=users');
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = formatUserDisplayName(profile);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid user ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-2xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit User Profile</h1>
            <p className="text-sm text-muted-foreground">
              Admin editing for user: {userId.slice(0, 8)}...
            </p>
          </div>
        </div>

        {loading ? (
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Skeleton className="h-24 w-24 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Profile not found. The user may not exist or you don't have permission to view it.
              </p>
              <Button variant="outline" className="mt-4" onClick={handleBack}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>
                Manage this user's profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4">
                    <AvatarUpload
                      currentAvatar={profile.avatar_url || undefined}
                      displayName={displayName}
                      initials={getInitials(displayName)}
                      onUpload={uploadAvatarFile}
                      uploading={uploadingAvatar}
                    />
                  </div>

                  {/* User ID (read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <Input
                      value={userId}
                      disabled
                      className="font-mono text-sm bg-muted"
                    />
                  </div>

                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value || ''}
                            onChange={field.onChange}
                            countryCode={form.watch('phone_country_code')}
                            onCountryCodeChange={(code) => form.setValue('phone_country_code', code)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleBack}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting || !isDirty}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <UnsavedChangesDialog
          open={!!pendingNavigation}
          onOpenChange={(open) => !open && setPendingNavigation(null)}
          onConfirm={confirmNavigation}
        />
      </div>
    </div>
  );
}
