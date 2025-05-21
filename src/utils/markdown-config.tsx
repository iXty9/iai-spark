
import DOMPurify from 'dompurify';
import { ReactNode } from 'react';

// Configure DOMPurify
const purifyConfig = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
};

// Safe HTML sanitization with type checks
export const sanitizeHtml = (html: string): string => {
  // Check if trustedTypes is available in the window object
  if (typeof window !== 'undefined' && 'trustedTypes' in window) {
    // Using optional chaining and type checking
    const trustedTypesWindow = window as Window & {
      trustedTypes?: {
        createPolicy: (name: string, rules: any) => {
          createHTML: (html: string) => any;
        };
      };
    };

    if (trustedTypesWindow.trustedTypes) {
      try {
        // Create a policy if it doesn't exist
        const policy = trustedTypesWindow.trustedTypes.createPolicy('purify', {
          createHTML: (html: string) => html
        });

        return DOMPurify.sanitize(policy.createHTML(html), purifyConfig);
      } catch (e) {
        // If policy already exists or other error, fallback to regular sanitization
        return DOMPurify.sanitize(html, purifyConfig);
      }
    }
  }
  
  // Default sanitization if trustedTypes not available
  return DOMPurify.sanitize(html, purifyConfig);
};

// Code block renderer
export const CodeBlock = ({ children, className }: { children: ReactNode, className?: string }) => {
  return (
    <pre className={`${className || ''} p-4 bg-gray-800 text-white rounded-md overflow-x-auto my-4`}>
      <code>{children}</code>
    </pre>
  );
};

// Link renderer with security attributes
export const SafeLink = ({ href, children }: { href: string, children: ReactNode }) => {
  // Determine if the link is external
  const isExternal = href && (
    href.startsWith('http://') || 
    href.startsWith('https://') || 
    href.startsWith('//')
  );

  return (
    <a 
      href={href}
      className="text-blue-500 hover:text-blue-700 underline"
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
};
