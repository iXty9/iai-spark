
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/phone-input';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileFormField } from '@/components/profile/FormField';
import { UnsavedChangesDialog } from '@/components/profile/UnsavedChangesDialog';
import { useProfileForm } from '@/hooks/profile/useProfileForm';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const {
    form,
    isSubmitting,
    uploadingAvatar,
    isDirty,
    onSubmit,
    uploadAvatarFile,
  } = useProfileForm();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Handle navigation with unsaved changes
  const handleNavigation = (path: string) => {
    if (isDirty && !isSubmitting) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      navigate(path);
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  // Prevent browser navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  const getDisplayName = (): string => {
    const values = form.getValues();
    if (values.first_name && values.last_name) {
      return `${values.first_name} ${values.last_name}`;
    }
    if (values.username) return values.username;
    return user?.email || 'User';
  };

  const getInitials = (): string => {
    const values = form.getValues();
    if (values.first_name && values.last_name) {
      return `${values.first_name[0]}${values.last_name[0]}`.toUpperCase();
    }
    if (values.username) return values.username[0].toUpperCase();
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const profile = useAuth().profile;

  if (!user) {
    return null; // Will redirect
  }

  return (
    <>
      <div className="container max-w-2xl py-10">
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2"
              onClick={() => handleNavigation('/')}
              aria-label="Go back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-center">Profile Settings</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-6">
                {/* Avatar Upload Section */}
                <AvatarUpload
                  currentAvatar={profile?.avatar_url}
                  displayName={getDisplayName()}
                  initials={getInitials()}
                  onUpload={uploadAvatarFile}
                  uploading={uploadingAvatar}
                  disabled={isSubmitting}
                />

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Email - Read Only */}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      value={user.email || ''} 
                      disabled 
                      className="bg-muted"
                      aria-label="Email address (read-only)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed from this page
                    </p>
                  </div>

                  {/* Username */}
                  <ProfileFormField
                    form={form}
                    name="username"
                    label="Username"
                    placeholder="Enter your username"
                    disabled={isSubmitting || uploadingAvatar}
                  />

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileFormField
                      form={form}
                      name="first_name"
                      label="First Name"
                      placeholder="Enter your first name"
                      disabled={isSubmitting || uploadingAvatar}
                    />
                    <ProfileFormField
                      form={form}
                      name="last_name"
                      label="Last Name"
                      placeholder="Enter your last name"
                      disabled={isSubmitting || uploadingAvatar}
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      value={form.watch('phone_number') || ''}
                      onChange={(value) => form.setValue('phone_number', value, { shouldDirty: true })}
                      countryCode={form.watch('phone_country_code')}
                      onCountryCodeChange={(code) => form.setValue('phone_country_code', code, { shouldDirty: true })}
                      disabled={isSubmitting || uploadingAvatar}
                      aria-label="Phone number"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional - Used for account recovery and notifications
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => handleNavigation('/')}
                    disabled={isSubmitting || uploadingAvatar}
                    className="sm:w-auto"
                  >
                    Cancel
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <span className="text-sm text-muted-foreground">
                        • Unsaved changes
                      </span>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || uploadingAvatar || !isDirty}
                      className="sm:w-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={confirmNavigation}
      />
    </>
  );
}
