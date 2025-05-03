
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDescription } from '@/components/ui/alert';

interface WebhookUrlFormFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function WebhookUrlFormField({
  id,
  name,
  label,
  value,
  error,
  placeholder,
  onChange
}: WebhookUrlFormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? "border-destructive" : ""}
      />
      {error && (
        <AlertDescription className="text-destructive text-sm mt-1">
          {error}
        </AlertDescription>
      )}
    </div>
  );
}
