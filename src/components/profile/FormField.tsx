
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ProfileFormValues } from '@/hooks/profile/useProfileForm';

interface FormFieldProps {
  form: UseFormReturn<ProfileFormValues>;
  name: keyof ProfileFormValues;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}

export function ProfileFormField({ 
  form, 
  name, 
  label, 
  placeholder, 
  disabled = false,
  type = 'text'
}: FormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              {...field} 
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              aria-describedby={`${name}-error`}
            />
          </FormControl>
          <FormMessage id={`${name}-error`} />
        </FormItem>
      )}
    />
  );
}
