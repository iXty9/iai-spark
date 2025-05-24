
import React from 'react';
import DOMPurify from 'dompurify';

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

// Markdown components for react-markdown
const markdownComponents = {
  p: ({ children }: any) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
  h4: ({ children }: any) => <h4 className="text-base font-bold mb-2">{children}</h4>,
  h5: ({ children }: any) => <h5 className="text-sm font-bold mb-2">{children}</h5>,
  h6: ({ children }: any) => <h6 className="text-xs font-bold mb-2">{children}</h6>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="ml-2">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-3">{children}</blockquote>
  ),
  code: ({ inline, children }: any) => 
    inline ? (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ) : (
      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3">
        <code className="text-sm font-mono">{children}</code>
      </pre>
    ),
  pre: ({ children }: any) => (
    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3">
      {children}
    </pre>
  ),
  a: ({ href, children }: any) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }: any) => (
    <img 
      src={src} 
      alt={alt} 
      className="max-w-full h-auto rounded-lg mb-3"
    />
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full border border-gray-300">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-gray-50 dark:bg-gray-700">{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  tr: ({ children }: any) => <tr className="border-b border-gray-200">{children}</tr>,
  th: ({ children }: any) => (
    <th className="px-4 py-2 text-left font-semibold border-r border-gray-300 last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2 border-r border-gray-300 last:border-r-0">
      {children}
    </td>
  ),
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>
};

export { DOMPurify, sanitizerConfig, trustedTypesPolicy, markdownComponents };
