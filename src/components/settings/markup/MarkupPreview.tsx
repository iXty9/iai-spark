
import React from 'react';
import { Code } from 'lucide-react';
import { ThemeColors } from '@/types/theme';

interface MarkupPreviewProps {
  colors: ThemeColors;
}

export const MarkupPreview: React.FC<MarkupPreviewProps> = ({ colors }) => {
  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <h4 className="font-medium mb-2 flex items-center gap-2">
        <Code className="h-4 w-4" />
        Preview
      </h4>
      <div className="space-y-3 text-sm">
        <p>Here's how your markup elements will look:</p>
        
        <div 
          className="inline-block px-2 py-1 rounded text-xs font-mono border"
          style={{ 
            backgroundColor: colors.codeBlockBackground || '#f3f4f6',
            color: colors.codeBlockTextColor || '#1f2937'
          }}
        >
          code block
        </div>
        
        <div>
          <span 
            className="underline px-1 py-0.5 rounded cursor-pointer transition-colors"
            style={{ color: colors.linkTextColor || colors.linkColor || '#2563eb' }}
            onMouseEnter={(e) => {
              if (colors.linkColor) {
                e.currentTarget.style.backgroundColor = colors.linkColor;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            example link (hover me)
          </span>
        </div>
        
        <div 
          className="border-l-4 pl-2 italic text-xs"
          style={{ 
            borderLeftColor: colors.blockquoteColor || '#d1d5db',
            color: colors.blockquoteTextColor || '#4b5563'
          }}
        >
          blockquote text
        </div>
        
        <div 
          className="inline-block px-2 py-1 text-xs font-semibold rounded"
          style={{ 
            backgroundColor: colors.tableHeaderBackground || '#f9fafb',
            color: colors.tableHeaderTextColor || '#111827'
          }}
        >
          table header
        </div>
      </div>
    </div>
  );
};
