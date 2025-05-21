import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, UserRound, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Supported image types
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Form validation schema
const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  first_name: z
    .string()
    .max(50, "First name cannot exceed 50 characters")
    .optional(),
  last_name: z
    .string()
    .max(50, "Last name cannot exceed 50 characters")
    .optional(),
  phone_country_code: z.string(),
  phone_number: z
    .string()
    .regex(/^(\d{3}-\d{3}-\d{4})?$/, "Please enter a valid phone number (XXX-XXX-XXXX)")
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1"); // Default to US
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form with profile data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: profile?.username || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_country_code: "+1",
      phone_number: profile?.phone_number || '',
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Update form when profile changes
    if (profile) {
      form.reset({
        username: profile.username || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone_country_code: phoneCountryCode,
        phone_number: profile.phone_number || '',
      });
    }
  }, [profile, form, phoneCountryCode]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Combine phone data
      const updatedProfile = {
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        phone_country_code: data.phone_country_code,
      };
      
      await updateProfile(updatedProfile);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "File must be a valid image type (JPEG, PNG, or WebP)";
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 5MB";
    }
    
    return null;
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      
      const file = event.target.files[0];
      
      // Validate file
      const error = validateFile(file);
      if (error) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: error,
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setUploading(true);
      
      // Check if storage API is available
      if (!supabase.storage || typeof supabase.storage.from !== 'function') {
        throw new Error('Storage API is not available. Please make sure the application is properly initialized.');
      }
      
      // Generate a secure random filename with file extension
      const fileExt = file.name.split('.').pop();
      const randomString = crypto.randomUUID();
      const filePath = `${user!.id}/${randomString}.${fileExt}`;
      
      // Upload the file to Supabase storage
      const uploadResponse = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadResponse?.error) {
        throw uploadResponse.error;
      }
      
      // Get the public URL
      const urlResponse = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (!urlResponse?.data?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      // Update the user's profile with the new avatar URL
      await updateProfile({ avatar_url: urlResponse.data.publicUrl });
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading your avatar",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const getInitials = () => {
    // Try to get initials from first and last name first
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    
    // Fall back to username
    if (profile?.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    
    // Fall back to email
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  return (
    <div className="container max-w-2xl py-10">
      <Card className="bg-background/80 backdrop-blur-sm">
        <CardHeader className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-2 top-2" 
            onClick={handleGoBack}
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
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile?.username || "User"} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getInitials()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
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
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          onCountryCodeChange={(code) => form.setValue('phone_country_code', code)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleGoBack} type="button">
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
