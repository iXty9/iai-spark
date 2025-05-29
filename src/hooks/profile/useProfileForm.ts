
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAvatar, deleteOldAvatar } from '@/utils/avatar-utils';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

const profileFormSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"),
  first_name: z.string().max(50, "First name cannot exceed 50 characters").optional(),
  last_name: z.string().max(50, "Last name cannot exceed 50 characters").optional(),
  phone_country_code: z.string().default('+1'),
  phone_number: z.string()
    .regex(/^(\+?[\d\s\-\(\)]+)?$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function useProfileForm() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
      phone_country_code: '+1',
      phone_number: '',
    },
  });

  // Reset form when profile changes
  useEffect(() => {
    if (profile) {
      const formValues = {
        username: profile.username || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_country_code: profile.phone_country_code || '+1',
        phone_number: profile.phone_number || '',
      };
      form.reset(formValues);
      setIsDirty(false);
    }
  }, [profile, form]);

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

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await updateProfile(data);
      setIsDirty(false);
      showToast('success', "Profile updated", "Your profile has been updated successfully.");
    } catch (error: any) {
      logger.error('Profile update error:', error);
      showToast('error', "Update failed", error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      // Delete old avatar first
      if (profile?.avatar_url) {
        await deleteOldAvatar(profile.avatar_url, user.id);
      }

      const result = await uploadAvatar(file, user.id);
      
      if (!result.success) {
        showToast('error', "Upload failed", result.error || "Failed to upload avatar");
        return;
      }

      await updateProfile({ avatar_url: result.url });
      showToast('success', "Avatar updated", "Your profile picture has been updated successfully");
    } catch (error: any) {
      logger.error('Avatar upload error:', error);
      showToast('error', "Upload failed", error.message || "There was an error uploading your avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return {
    form,
    isSubmitting,
    uploadingAvatar,
    isDirty,
    onSubmit: form.handleSubmit(onSubmit),
    uploadAvatarFile,
    showToast,
  };
}
