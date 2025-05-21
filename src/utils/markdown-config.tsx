
import React from 'react';
import DOMPurify from 'dompurify';
import type { Components } from 'react-markdown';

// Define a trusted policy types interface for TypeScript
interface TrustedTypePolicyOptions {
  createHTML?: (input: string, ...args: any[]) => string;
}

// Create a trusted HTML policy if supported by the browser
let sanitizeHtml = (html: string) => html;
if (typeof window !== 'undefined' && window.trustedTypes) {
  try {
    const policy = window.trustedTypes.createPolicy('markdown-html', {
      createHTML: (html: string) => DOMPurify.sanitize(html),
    });
    sanitizeHtml = (html: string) => policy.createHTML(html) as unknown as string;
  } catch (e) {
    console.error('Failed to create trusted types policy', e);
    sanitizeHtml = (html: string) => DOMPurify.sanitize(html);
  }
}

// Extended props interface for markdown components
interface ExtraProps {
  ordered?: boolean;
  inline?: boolean;
}

// Define custom markdown components
export const markdownComponents: Components = {
  // List components
  ul: ({ node, ordered, ...props }: React.HTMLProps<HTMLUListElement> & ExtraProps) => (
    <ul className="list-disc pl-6 my-4 space-y-2" {...props} />
  ),
  ol: ({ node, ordered, ...props }: React.OlHTMLAttributes<HTMLOListElement> & ExtraProps) => (
    <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />
  ),
  li: ({ node, ...props }: React.HTMLProps<HTMLLIElement>) => (
    <li className="my-1" {...props} />
  ),
  
  // Text formatting
  p: ({ node, ...props }: React.HTMLProps<HTMLParagraphElement>) => (
    <p className="mb-4 last:mb-0" {...props} />
  ),
  h1: ({ node, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h1 className="text-2xl font-bold mt-6 mb-3" {...props} />
  ),
  h2: ({ node, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h2 className="text-xl font-bold mt-6 mb-2" {...props} />
  ),
  h3: ({ node, ...props }: React.HTMLProps<HTMLHeadingElement>) => (
    <h3 className="text-lg font-bold mt-4 mb-2" {...props} />
  ),
  
  // Code blocks
  code: ({ node, inline, ...props }: React.HTMLProps<HTMLElement> & ExtraProps) => {
    const className = props.className || '';
    return inline ? (
      <code className="px-1 py-0.5 bg-muted rounded font-mono text-sm" {...props} />
    ) : (
      <pre className="p-4 bg-muted rounded-md overflow-x-auto my-4">
        <code className={`${className} font-mono text-sm`} {...props} />
      </pre>
    );
  },
  
  // Links and other elements
  a: ({ node, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  blockquote: ({ node, ...props }: React.HTMLProps<HTMLQuoteElement>) => (
    <blockquote className="pl-4 border-l-4 border-muted-foreground/20 italic my-4" {...props} />
  ),
  hr: ({ node, ...props }: React.HTMLProps<HTMLHRElement>) => (
    <hr className="my-6 border-t-2 border-border" {...props} />
  ),
};

// Sanitizer function for HTML content
export const sanitizeMarkdownHtml = (html: string): string => {
  return sanitizeHtml(html);
};
