import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';
import { 
  fetchUserProfile, 
  updateUserProfile, 
  AdminProfileData 
} from '@/services/admin/adminProfileService';
import { uploadAvatar, deleteOldAvatar } from '@/utils/avatar-utils';

const adminProfileFormSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  first_name: z.string().max(50, "First name cannot exceed 50 characters").optional().or(z.literal('')),
  last_name: z.string().max(50, "Last name cannot exceed 50 characters").optional().or(z.literal('')),
  phone_country_code: z.string().default('+1'),
  phone_number: z.string()
    .regex(/^(\+?[\d\s\-\(\)]+)?$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal('')),
});

export type AdminProfileFormValues = z.infer<typeof adminProfileFormSchema>;

export function useAdminProfileForm(userId: string) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<AdminProfileFormValues>({
    resolver: zodResolver(adminProfileFormSchema),
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
      phone_country_code: '+1',
      phone_number: '',
    },
  });

  // Load profile on mount
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetchUserProfile(userId)
      .then((data) => {
        setProfile(data);
        if (data) {
          form.reset({
            username: data.username || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone_country_code: data.phone_country_code || '+1',
            phone_number: data.phone_number || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [userId, form]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(form.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const showToast = useCallback((type: 'success' | 'error', title: string, description: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : undefined,
      title,
      description,
    });
  }, [toast]);

  const onSubmit = async (data: AdminProfileFormValues) => {
    if (!userId) return;

    setIsSubmitting(true);
    try {
      const result = await updateUserProfile(userId, {
        username: data.username,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        phone_country_code: data.phone_country_code,
        phone_number: data.phone_number || undefined,
      });

      if (result.success) {
        setIsDirty(false);
        // Refresh profile data
        const updated = await fetchUserProfile(userId);
        setProfile(updated);
        showToast('success', 'Profile updated', 'User profile has been updated successfully.');
      } else {
        showToast('error', 'Update failed', result.error || 'Failed to update profile.');
      }
    } catch (error: any) {
      logger.error('Admin profile update error:', error);
      showToast('error', 'Update failed', error.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    if (!userId || !profile) return;

    setUploadingAvatar(true);
    try {
      // Delete old avatar first
      if (profile.avatar_url) {
        await deleteOldAvatar(profile.avatar_url, userId);
      }

      const result = await uploadAvatar(file, userId);

      if (!result.success) {
        showToast('error', 'Upload failed', result.error || 'Failed to upload avatar');
        return;
      }

      // Update profile with new avatar URL
      const updateResult = await updateUserProfile(userId, {});
      // Actually we need to update avatar_url which is not in our update interface
      // We'll need to use supabase directly for avatar
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', userId);

      // Refresh profile
      const updated = await fetchUserProfile(userId);
      setProfile(updated);
      
      showToast('success', 'Avatar updated', 'User avatar has been updated successfully.');
    } catch (error: any) {
      logger.error('Admin avatar upload error:', error);
      showToast('error', 'Upload failed', error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return {
    form,
    profile,
    loading,
    isSubmitting,
    uploadingAvatar,
    isDirty,
    onSubmit: form.handleSubmit(onSubmit),
    uploadAvatarFile,
    showToast,
  };
}
