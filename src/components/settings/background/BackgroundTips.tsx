
import React from 'react';

export function BackgroundTips() {
  return (
    <div className="bg-background/50 rounded-lg p-4 space-y-2 border border-border/20">
      <h4 className="font-medium text-sm text-foreground">Tips for best results:</h4>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• Use images sized at least 1920×1080px</div>
        <div>• Maximum file size: 5MB</div>
        <div>• Supported: JPG, PNG, WebP, GIF</div>
      </div>
    </div>
  );
}
