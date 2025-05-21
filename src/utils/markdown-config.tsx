
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { highlight } from 'shiki';

// Initialize MarkdownIt with syntax highlighting
const md = MarkdownIt({
  highlight: (code, lang) => {
    if (lang) {
      return highlight(code, { lang, theme: 'github-dark' })
        .then(html => `<pre class="shiki shiki-themes github-dark">${html}</pre>`);
    }
    return '<pre class="hljs">' + md.utils.escapeHtml(code) + '</pre>';
  },
  html: true, // Enable HTML tags in source
  linkify: true, // Autoconvert URL-like text to links
});

// Configure DOMPurify with trusted types if available
const configureDOMPurify = () => {
  if (typeof window !== 'undefined') {
    // Check if trustedTypes is available in the browser
    const hasTrustedTypes = 
      typeof window !== 'undefined' && 
      window.trustedTypes !== undefined;

    if (hasTrustedTypes) {
      try {
        const tt = window.trustedTypes;
        const policy = tt.createPolicy?.('markdown-html', {
          createHTML: (string: string) => string
        });
        
        DOMPurify.setConfig({
          RETURN_TRUSTED_TYPE: true,
          TRUSTED_TYPES_POLICY: policy ?? tt.defaultPolicy
        });
      } catch (e) {
        console.error('Error configuring DOMPurify with TrustedTypes:', e);
      }
    }
  }
};

// Fix window.trustedTypes type issue by extending Window interface
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy?: (name: string, rules: { createHTML: (s: string) => string }) => any;
      defaultPolicy?: any;
    };
  }
}

// Initialize DOMPurify configuration
configureDOMPurify();

/**
 * Render markdown to HTML and sanitize it
 */
export const renderMarkdown = (markdown: string): string => {
  try {
    const html = md.render(markdown);
    if (typeof window !== 'undefined') {
      return DOMPurify.sanitize(html) as string;
    }
    return html;
  } catch (error) {
    console.error("Failed to render markdown:", error);
    return `<p>Error rendering markdown: ${String(error)}</p>`;
  }
};

// Export markdown components for React integration
export const markdownComponents = {
  // Basic components for React Markdown integration
  p: (props: any) => <p className="mb-4" {...props} />,
  h1: (props: any) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
  h2: (props: any) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
  h3: (props: any) => <h3 className="text-xl font-bold mb-3 mt-4" {...props} />,
  ul: (props: any) => <ul className="list-disc pl-6 mb-4" {...props} />,
  ol: (props: any) => <ol className="list-decimal pl-6 mb-4" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  a: (props: any) => <a className="text-blue-600 hover:underline" {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-4 border-gray-200 pl-4 italic my-4" {...props} />
};
