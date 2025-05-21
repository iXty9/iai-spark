
import React from 'react';
import { Components } from 'react-markdown';
import DOMPurify from 'dompurify';

// Configure DOMPurify for trustedTypes if supported
if (typeof window !== 'undefined' && window.trustedTypes) {
  const policy = window.trustedTypes.createPolicy('markdown-policy', {
    createHTML: (string) => string
  });
  
  DOMPurify.setConfig({
    TRUSTED_TYPES_POLICY: 'markdown-policy',
    RETURN_TRUSTED_TYPE: true
  });
}

// Configure markdown components
export const markdownComponents: Components = {
  // Override standard elements
  p: ({ node, ...props }) => <p className="mb-4" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 mt-6" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-2 mt-5" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
  h4: ({ node, ...props }) => <h4 className="text-base font-semibold mb-1 mt-3" {...props} />,
  ul: ({ node, ordered, ...props }) => <ul className="mb-4 ml-6 list-disc" {...props} />,
  ol: ({ node, ordered, ...props }) => <ol className="mb-4 ml-6 list-decimal" {...props} />,
  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
  a: ({ node, href, ...props }) => {
    // Basic URL validation
    const isSafeUrl = href && (href.startsWith('http') || href.startsWith('/') || href.startsWith('#'));
    return (
      <a 
        href={isSafeUrl ? href : '#'}
        className="text-primary hover:underline" 
        target={href?.startsWith('http') ? "_blank" : undefined}
        rel={href?.startsWith('http') ? "noopener noreferrer" : undefined}
        {...props}
      />
    );
  },
  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-200 pl-4 py-2 mb-4 italic" {...props} />,
  code: ({ node, inline, ...props }) => {
    if (inline) {
      return <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded" {...props} />;
    }
    return <code className="font-mono text-sm block bg-muted p-3 mb-4 rounded overflow-auto" {...props} />;
  },
  hr: ({ node, ...props }) => <hr className="border-t border-gray-300 my-6" {...props} />,
  pre: ({ node, ...props }) => <pre className="mb-4 overflow-auto" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
  table: ({ node, ...props }) => <table className="w-full border-collapse mb-4" {...props} />,
  thead: ({ node, ...props }) => <thead className="bg-muted" {...props} />,
  tbody: ({ node, ...props }) => <tbody {...props} />,
  tr: ({ node, ...props }) => <tr className="border-b border-gray-200" {...props} />,
  th: ({ node, ...props }) => <th className="p-2 text-left" {...props} />,
  td: ({ node, ...props }) => <td className="p-2" {...props} />,
  img: ({ node, src, alt, ...props }) => {
    // Validate image URL and alt text
    const safeAlt = alt || 'Image';
    const isSafeUrl = src && (
      src.startsWith('http') || 
      src.startsWith('/') || 
      src.startsWith('data:image/')
    );
    
    return (
      <img 
        src={isSafeUrl ? src : ''} 
        alt={safeAlt} 
        className="max-w-full h-auto my-4 rounded"
        loading="lazy"
        {...props} 
      />
    );
  }
};

export default markdownComponents;
