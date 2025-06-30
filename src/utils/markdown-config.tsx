import React from 'react';
import DOMPurify from 'dompurify';
import { ThemeColors } from '@/types/theme';

// Create a trusted types policy if available
let trustedTypesPolicy: any = null;

if (typeof window !== 'undefined') {
  try {
    const TrustedTypes = (window as any).trustedTypes;
    if (TrustedTypes && TrustedTypes.createPolicy) {
      trustedTypesPolicy = TrustedTypes.createPolicy('dompurify', {
        createHTML: (input: string) => input
      });
    }
  } catch (e) {
    // TrustedTypes not supported, continue without it
  }
}

// Configure DOMPurify
const sanitizerConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id'
  ],
  ALLOW_DATA_ATTR: false,
  RETURN_TRUSTED_TYPE: !!trustedTypesPolicy
};

// Factory function to create markdown components with theme support
export const createMarkdownComponents = (themeColors?: ThemeColors) => {
  return {
    p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 leading-tight">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 leading-tight">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0 leading-tight">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-bold mb-2 mt-3 first:mt-0 leading-tight">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-sm font-bold mb-2 mt-2 first:mt-0 leading-tight">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-xs font-bold mb-2 mt-2 first:mt-0 leading-tight">{children}</h6>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-2 pl-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-2 pl-2">{children}</ol>,
    li: ({ children }: any) => <li className="ml-2 leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote 
        className="pl-4 italic mb-4 py-2 rounded-r-md"
        style={{
          borderLeft: `4px solid ${themeColors?.blockquoteColor || '#d1d5db'}`,
          backgroundColor: themeColors?.blockquoteColor ? `${themeColors.blockquoteColor}10` : '#f9fafb',
          color: themeColors?.blockquoteTextColor || 'inherit'
        }}
      >
        {children}
      </blockquote>
    ),
    code: ({ inline, children }: any) => 
      inline ? (
        <code 
          className="px-1.5 py-0.5 rounded text-sm font-mono border"
          style={{
            backgroundColor: themeColors?.codeBlockBackground || '#f3f4f6',
            color: themeColors?.codeBlockTextColor || 'inherit'
          }}
        >
          {children}
        </code>
      ) : (
        <pre 
          className="p-4 rounded-lg overflow-x-auto mb-4 border"
          style={{
            backgroundColor: themeColors?.codeBlockBackground || '#f3f4f6'
          }}
        >
          <code 
            className="text-sm font-mono"
            style={{
              color: themeColors?.codeBlockTextColor || 'inherit'
            }}
          >
            {children}
          </code>
        </pre>
      ),
    pre: ({ children }: any) => (
      <pre 
        className="p-4 rounded-lg overflow-x-auto mb-4 border"
        style={{
          backgroundColor: themeColors?.codeBlockBackground || '#f3f4f6',
          color: themeColors?.codeBlockTextColor || 'inherit'
        }}
      >
        {children}
      </pre>
    ),
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="underline underline-offset-2 transition-colors"
        style={{
          color: themeColors?.linkTextColor || themeColors?.linkColor || '#2563eb'
        }}
      >
        {children}
      </a>
    ),
    img: ({ src, alt }: any) => (
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full h-auto rounded-lg mb-4 border shadow-sm"
      />
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead 
        style={{
          backgroundColor: themeColors?.tableHeaderBackground || '#f9fafb'
        }}
      >
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => <tbody className="divide-y divide-gray-200 dark:divide-gray-600">{children}</tbody>,
    tr: ({ children }: any) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">{children}</tr>,
    th: ({ children }: any) => (
      <th 
        className="px-4 py-3 text-left font-semibold border-r border-gray-300 dark:border-gray-600 last:border-r-0 text-sm"
        style={{
          color: themeColors?.tableHeaderTextColor || 'inherit'
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 last:border-r-0 text-sm">
        {children}
      </td>
    ),
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    hr: () => <hr className="my-6 border-gray-300 dark:border-gray-600" />,
    div: ({ children }: any) => <div className="mb-2">{children}</div>,
    br: () => <br className="leading-relaxed" />
  };
};

// Default export for backwards compatibility
export const markdownComponents = createMarkdownComponents();

export { DOMPurify, sanitizerConfig, trustedTypesPolicy };
