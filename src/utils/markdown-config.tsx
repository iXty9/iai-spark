
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

export { DOMPurify, sanitizerConfig, trustedTypesPolicy };
