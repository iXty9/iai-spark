
import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

interface BackgroundImageUploadProps {
  onBackgroundImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
  hasBackgroundImage: boolean;
}

export function BackgroundImageUpload({
  onBackgroundImageUpload,
  isLoading = false,
  hasBackgroundImage
}: BackgroundImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.files = files;
        
        const changeEvent = new Event('change', { bubbles: true }) as any;
        changeEvent.target = input;
        
        onBackgroundImageUpload(changeEvent as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [onBackgroundImageUpload]);

  return (
    <div className="space-y-4">
      <div 
        className={`w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/30 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Drag and drop an image here or use the button below
          </p>
        </div>
      </div>

      <Button variant="outline" asChild className="w-full" disabled={isLoading}>
        <label className="cursor-pointer">
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {hasBackgroundImage ? 'Change Background Image' : 'Upload Background Image'}
          <input
            type="file"
            accept="image/*"
            onChange={onBackgroundImageUpload}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      </Button>
    </div>
  );
}
