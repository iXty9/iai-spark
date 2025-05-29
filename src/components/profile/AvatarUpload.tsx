
import React, { useRef, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { validateFileSecurely } from '@/utils/security';

interface AvatarUploadProps {
  currentAvatar?: string;
  displayName: string;
  initials: string;
  onUpload: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUpload({ 
  currentAvatar, 
  displayName, 
  initials, 
  onUpload, 
  uploading = false,
  disabled = false 
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFileSecurely(file, {
      maxSize: MAX_FILE_SIZE,
      allowedTypes: ACCEPTED_IMAGE_TYPES
    });

    if (validationError) {
      // Error will be handled by parent component
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    onUpload(file);
  }, [onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file);
      }
    }
  }, [disabled, uploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Clear preview when upload completes
  React.useEffect(() => {
    if (!uploading && previewUrl) {
      clearPreview();
    }
  }, [uploading, previewUrl]);

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className={`relative group ${dragOver ? 'scale-105' : ''} transition-transform duration-200`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Avatar className="h-24 w-24">
          {displayAvatar ? (
            <AvatarImage 
              src={displayAvatar} 
              alt={`${displayName}'s avatar`} 
              className={uploading ? 'opacity-50' : ''}
            />
          ) : (
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          )}
        </Avatar>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {previewUrl && !uploading && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={clearPreview}
            aria-label="Cancel upload"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-full border-2 border-primary border-dashed">
            <Upload className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>

      <Button 
        variant="outline" 
        asChild 
        disabled={disabled || uploading}
        className={dragOver ? 'scale-105' : ''}
      >
        <label className="cursor-pointer flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Uploading...' : 'Upload Avatar'}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
            aria-label="Upload avatar image"
          />
        </label>
      </Button>

      <div className="text-xs text-muted-foreground text-center max-w-xs">
        <p>Drag and drop an image or click to upload</p>
        <p>Supported: JPG, PNG, WebP • Max 5MB • Up to 1024×1024px</p>
      </div>
    </div>
  );
}
