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
import { UserWebhookSettings } from '@/components/admin/users/UserWebhookConfig';

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
  
  // Webhook settings state (managed separately from react-hook-form)
  const [webhookSettings, setWebhookSettings] = useState<UserWebhookSettings>({
    webhook_url: '',
    custom_webhook_enabled: false,
    custom_webhook_auth_header_name: '',
    custom_webhook_auth_header_value: '',
    custom_webhook_use_auth: false,
  });
  const [webhookUrlError, setWebhookUrlError] = useState<string | undefined>();
  const [webhookDirty, setWebhookDirty] = useState(false);

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
          
          // Set webhook settings from profile
          setWebhookSettings({
            webhook_url: data.webhook_url || '',
            custom_webhook_enabled: data.custom_webhook_enabled ?? false,
            custom_webhook_auth_header_name: data.custom_webhook_auth_header_name || '',
            custom_webhook_auth_header_value: data.custom_webhook_auth_header_value || '',
            custom_webhook_use_auth: data.custom_webhook_use_auth ?? false,
          });
          setWebhookDirty(false);
        }
      })
      .finally(() => setLoading(false));
  }, [userId, form]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(form.formState.isDirty || webhookDirty);
    });
    return () => subscription.unsubscribe();
  }, [form, webhookDirty]);

  // Update isDirty when webhook changes
  useEffect(() => {
    setIsDirty(form.formState.isDirty || webhookDirty);
  }, [webhookDirty, form.formState.isDirty]);

  const showToast = useCallback((type: 'success' | 'error', title: string, description: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : undefined,
      title,
      description,
    });
  }, [toast]);

  const handleWebhookChange = useCallback((newSettings: UserWebhookSettings) => {
    setWebhookSettings(newSettings);
    setWebhookDirty(true);
    
    // Clear URL error when user types
    if (webhookUrlError) {
      setWebhookUrlError(undefined);
    }
  }, [webhookUrlError]);

  const validateWebhookSettings = (): boolean => {
    // Only validate URL if custom webhook is enabled and URL is provided
    if (webhookSettings.custom_webhook_enabled && webhookSettings.webhook_url) {
      try {
        const url = new URL(webhookSettings.webhook_url);
        if (url.protocol !== 'https:') {
          setWebhookUrlError('Webhook URL must use HTTPS');
          return false;
        }
      } catch {
        setWebhookUrlError('Invalid URL format');
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (data: AdminProfileFormValues) => {
    if (!userId) return;

    // Validate webhook settings
    if (!validateWebhookSettings()) {
      showToast('error', 'Validation failed', 'Please fix the webhook URL error before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateUserProfile(userId, {
        username: data.username,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        phone_country_code: data.phone_country_code,
        phone_number: data.phone_number || undefined,
        // Webhook fields
        webhook_url: webhookSettings.webhook_url || undefined,
        custom_webhook_enabled: webhookSettings.custom_webhook_enabled,
        custom_webhook_auth_header_name: webhookSettings.custom_webhook_auth_header_name || undefined,
        custom_webhook_auth_header_value: webhookSettings.custom_webhook_auth_header_value || undefined,
        custom_webhook_use_auth: webhookSettings.custom_webhook_use_auth,
      });

      if (result.success) {
        setIsDirty(false);
        setWebhookDirty(false);
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
    // Webhook-specific
    webhookSettings,
    webhookUrlError,
    handleWebhookChange,
  };
}
