import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { ThemeColors } from '@/types/theme';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

// Helper to extract text from React children
const extractTextFromChildren = (children: any): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children?.props?.children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
};

// Extract language from className (e.g., "language-javascript" -> "javascript")
const extractLanguage = (className?: string): string => {
  if (!className) return '';
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : '';
};

// Format language name for display
const formatLanguageName = (lang: string): string => {
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TypeScript React',
    jsx: 'JavaScript React',
    py: 'Python',
    python: 'Python',
    rb: 'Ruby',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    csharp: 'C#',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    md: 'Markdown',
    markdown: 'Markdown',
    bash: 'Bash',
    shell: 'Shell',
    sh: 'Shell',
    zsh: 'Zsh',
    powershell: 'PowerShell',
    dockerfile: 'Dockerfile',
    graphql: 'GraphQL',
    regex: 'Regex',
  };
  return languageMap[lang.toLowerCase()] || lang.toUpperCase();
};

// Inline code component with click-to-copy
const InlineCode = ({ children }: { children: any }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = extractTextFromChildren(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <code 
      className="px-1.5 py-0.5 rounded text-sm font-mono cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1"
      style={{
        backgroundColor: 'rgba(110, 118, 129, 0.4)',
        color: '#e6e6e6',
      }}
      onClick={handleCopy}
      title="Click to copy"
    >
      {children}
      {copied && <Check className="h-3 w-3 text-green-500" />}
    </code>
  );
};

// Block code component with syntax highlighting and copy button
const CodeBlock = ({ 
  children, 
  language
}: { 
  children: any; 
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const codeText = extractTextFromChildren(children).trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const displayLanguage = language ? formatLanguageName(language) : '';

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden shadow-lg syntax-highlighted-code" style={{ backgroundColor: '#282c34' }}>
      {/* Header with language label and copy button */}
      <div 
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: '#21252b' }}
      >
        <span className="text-xs font-medium text-gray-400">
          {displayLanguage || 'Code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors hover:bg-white/10 text-gray-400"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content with syntax highlighting and line numbers */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        showLineNumbers={true}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: 'calc(0.875rem * var(--chat-text-scale, 1))',
          lineHeight: 'var(--chat-line-height, 1.5)',
          backgroundColor: '#282c34',
          overflow: 'auto',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          }
        }}
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: '#636d83',
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid #3e4451',
          marginRight: '1em',
        }}
      >
        {codeText}
      </SyntaxHighlighter>
    </div>
  );
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
    ul: ({ children, className }: any) => {
      // Check if this is a task list (contains task-list-item children)
      const isTaskList = className?.includes('contains-task-list');
      return (
        <ul className={`${isTaskList ? 'list-none pl-0' : 'list-disc list-outside pl-6'} mb-4 space-y-1`}>
          {children}
        </ul>
      );
    },
    ol: ({ children }: any) => <ol className="list-decimal list-outside mb-4 space-y-1 pl-6">{children}</ol>,
    li: ({ children, className }: any) => {
      // Check if this is a task list item
      const isTaskListItem = className?.includes('task-list-item');
      return (
        <li className={`leading-relaxed ${isTaskListItem ? 'list-none flex items-start gap-2' : ''}`}>
          {children}
        </li>
      );
    },
    // Task list checkbox input
    input: ({ type, checked, disabled, ...props }: any) => {
      if (type === 'checkbox') {
        return (
          <input 
            type="checkbox" 
            checked={checked} 
            disabled={disabled}
            readOnly
            className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-default"
          />
        );
      }
      return <input type={type} {...props} />;
    },
    // Strikethrough for ~~text~~
    del: ({ children }: any) => (
      <del className="line-through text-muted-foreground">{children}</del>
    ),
    // Subscript for ~text~
    sub: ({ children }: any) => <sub className="text-xs">{children}</sub>,
    // Superscript for ^text^
    sup: ({ children }: any) => <sup className="text-xs">{children}</sup>,
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
    // pre just passes through - code handles the rendering
    pre: ({ children }: any) => <div className="not-prose">{children}</div>,
    // code handles both inline and block code
    // In react-markdown v9+, the 'inline' prop is no longer passed
    // We detect inline by: no className (language) AND content has no newlines
    code: ({ className, children, node }: any) => {
      const language = extractLanguage(className);
      const codeText = extractTextFromChildren(children);
      
      // Block code detection:
      // 1. Has a language class (e.g., language-javascript)
      // 2. Content contains newlines
      // 3. Parent is a <pre> tag (node check)
      const hasNewlines = codeText.includes('\n');
      const isBlockCode = !!className || hasNewlines;
      
      if (!isBlockCode) {
        return <InlineCode>{children}</InlineCode>;
      }
      
      return (
        <CodeBlock language={language}>
          {children}
        </CodeBlock>
      );
    },
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="underline underline-offset-2 transition-colors px-1 py-0.5 rounded"
        style={{
          color: themeColors?.linkTextColor || '#2563eb'
        }}
        onMouseEnter={(e) => {
          if (themeColors?.linkColor) {
            e.currentTarget.style.backgroundColor = themeColors.linkColor;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
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
        <table className="min-w-full border border-border rounded-lg overflow-hidden">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead 
        style={{
          backgroundColor: themeColors?.tableHeaderBackground || 'hsl(var(--muted))'
        }}
      >
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => <tbody className="divide-y divide-border">{children}</tbody>,
    tr: ({ children }: any) => (
      <tr className="hover:bg-muted/50 transition-colors [&:hover_td]:text-foreground">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th 
        className="px-4 py-3 text-left font-semibold border-r border-border last:border-r-0 text-sm text-foreground"
        style={{
          color: themeColors?.tableHeaderTextColor || 'inherit'
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 border-r border-border last:border-r-0 text-sm text-foreground">
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
