
import React from 'react';
import DOMPurify from 'dompurify';
import { HTMLProps, AnchorHTMLAttributes, OlHTMLAttributes } from 'react';

// Fix for trustedTypes not being available in all environments
let sanitizeHTML: (html: string) => string;

// Create a sanitizer that works in browsers with and without Trusted Types
if (typeof window !== 'undefined') {
  // Initialize DOMPurify
  sanitizeHTML = (html: string) => {
    return DOMPurify.sanitize(html);
  };
} else {
  // Server-side rendering fallback
  sanitizeHTML = (html: string) => html;
}

// Extra props for markdown components
interface ExtraProps {
  ordered?: boolean;
  inline?: boolean;
  // Adding node to satisfy TypeScript
  node?: any;
}

// Export the components that will be used to render markdown
export const markdownComponents = {
  // Basic elements
  ul: ({ className, ...props }: HTMLProps<HTMLUListElement> & ExtraProps) => (
    <ul className={`list-disc pl-6 my-4 ${className || ''}`} {...props} />
  ),
  ol: ({ className, ...props }: OlHTMLAttributes<HTMLOListElement> & ExtraProps) => (
    <ol className={`list-decimal pl-6 my-4 ${className || ''}`} {...props} />
  ),
  li: ({ className, ...props }: HTMLProps<HTMLLIElement>) => (
    <li className={`my-1 ${className || ''}`} {...props} />
  ),
  p: ({ className, ...props }: HTMLProps<HTMLParagraphElement>) => (
    <p className={`my-2 ${className || ''}`} {...props} />
  ),
  h1: ({ className, ...props }: HTMLProps<HTMLHeadingElement>) => (
    <h1 className={`text-3xl font-bold my-4 ${className || ''}`} {...props} />
  ),
  h2: ({ className, ...props }: HTMLProps<HTMLHeadingElement>) => (
    <h2 className={`text-2xl font-bold my-3 ${className || ''}`} {...props} />
  ),
  h3: ({ className, ...props }: HTMLProps<HTMLHeadingElement>) => (
    <h3 className={`text-xl font-bold my-2 ${className || ''}`} {...props} />
  ),
  // Code blocks
  code: ({ className, inline, ...props }: HTMLProps<HTMLElement> & ExtraProps) => (
    inline ? (
      <code className={`bg-muted px-1 py-0.5 rounded text-sm ${className || ''}`} {...props} />
    ) : (
      <code
        className={`block bg-muted p-3 rounded-md overflow-x-auto text-sm ${className || ''}`}
        {...props}
      />
    )
  ),
  // Links
  a: ({ className, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} className={`text-primary hover:underline ${className || ''}`} target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: ({ className, ...props }: HTMLProps<HTMLQuoteElement>) => (
    <blockquote className={`border-l-4 border-muted pl-4 italic my-2 ${className || ''}`} {...props} />
  ),
  hr: ({ className, ...props }: HTMLProps<HTMLHRElement>) => (
    <hr className={`my-4 border-t border-border ${className || ''}`} {...props} />
  ),
};

export default markdownComponents;
