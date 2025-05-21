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
      'trustedTypes' in window && 
      typeof (window as any).trustedTypes !== 'undefined';

    if (hasTrustedTypes) {
      const tt = (window as any).trustedTypes;
      const policy = tt.createPolicy?.('markdown-html', {
        createHTML: (string: string) => string
      });
      
      DOMPurify.setConfig({
        RETURN_TRUSTED_TYPE: true,
        TRUSTED_TYPES_POLICY: policy ?? tt.defaultPolicy
      });
    }
  }
};

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
