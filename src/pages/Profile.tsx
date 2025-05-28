import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const profileFormSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  first_name: z.string().max(50, "First name cannot exceed 50 characters").optional(),
  last_name: z.string().max(50, "Last name cannot exceed 50 characters").optional(),
  phone_country_code: z.string(),
  phone_number: z.string()
    .regex(/^(\d{3}-\d{3}-\d{4})?$/, "Please enter a valid phone number (XXX-XXX-XXXX)")
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: profile?.username || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_country_code: '+1',
      phone_number: profile?.phone_number || '',
    },
  });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_country_code: form.getValues('phone_country_code') || '+1',
        phone_number: profile.phone_number || '',
      });
    }
  // eslint-disable-next-line
  }, [profile]);

  const showToast = (type: 'success' | 'error', title: string, description: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : undefined,
      title,
      description,
    });
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile(data);
      showToast('success', "Profile updated", "Your profile has been updated successfully.");
    } catch (error: any) {
      showToast('error', "Error", error.message || "Failed to update profile");
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
      showToast('error', "Invalid file",
        !ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? "File must be a valid image type (JPEG, PNG, or WebP)"
        : "File size must be less than 5MB"
      );
      fileInputRef.current && (fileInputRef.current.value = '');
      return;
    }
    setUploading(true);
    try {
      if (!supabase.storage || typeof supabase.storage.from !== 'function') {
        throw new Error('Storage API not available.');
      }
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Failed to get public URL for uploaded file');
      await updateProfile({ avatar_url: data.publicUrl });
      showToast('success', "Avatar updated", "Your profile picture has been updated successfully");
    } catch (error: any) {
      showToast('error', "Upload failed", error.message || "There was an error uploading your avatar");
    } finally {
      setUploading(false);
      fileInputRef.current && (fileInputRef.current.value = '');
    }
  };

  const getInitials = () =>
    `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? profile?.username?.[0] ?? user?.email?.[0] ?? 'U'}`
      .toUpperCase();

  return (
    <div className="container max-w-2xl py-10">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-2"
            onClick={() => navigate('/')}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-center">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  {profile?.avatar_url
                    ? <AvatarImage src={profile.avatar_url} alt={profile?.username || "User"} />
                    : <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>}
                </Avatar>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      onChange={uploadAvatar}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </Button>
                <div className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, WebP. Max size: 5MB.
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
                </div>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['first_name', 'last_name'].map(name => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name as 'first_name' | 'last_name'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{name === 'first_name' ? 'First Name' : 'Last Name'}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
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
                          onCountryCodeChange={code => form.setValue('phone_country_code', code)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="outline" type="button" onClick={() => navigate('/')}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}