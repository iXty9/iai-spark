
import React from 'react';
import DOMPurify from 'dompurify';

interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

// Configure DOMPurify if in browser environment
if (typeof window !== 'undefined') {
  DOMPurify.setConfig({
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script'],
  });
  
  // Create trusted types policy if supported by browser
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!window.trustedTypes.defaultPolicy) {
      window.trustedTypes.createPolicy('default', {
        createHTML: (string) => string
      });
    }
  }
}

export const markdownComponents = {
  a: ({ node, ...props }: MarkdownComponentProps) => (
    <a 
      {...props} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-primary underline hover:text-primary/80 transition-colors"
    />
  ),
  h1: ({ node, ...props }: MarkdownComponentProps) => <h1 {...props} className="text-xl font-bold my-2" />,
  h2: ({ node, ...props }: MarkdownComponentProps) => <h2 {...props} className="text-lg font-bold my-2" />,
  h3: ({ node, ...props }: MarkdownComponentProps) => <h3 {...props} className="text-md font-bold my-1.5" />,
  p: ({ node, ...props }: MarkdownComponentProps) => <p {...props} className="my-1" />,
  ul: ({ node, ...props }: MarkdownComponentProps) => <ul {...props} className="list-disc pl-5 my-2" />,
  ol: ({ node, ...props }: MarkdownComponentProps) => <ol {...props} className="list-decimal pl-5 my-2" />,
  li: ({ node, ...props }: MarkdownComponentProps) => <li {...props} className="my-0.5" />,
  hr: ({ node, ...props }: MarkdownComponentProps) => <hr {...props} className="my-2 border-muted" />,
  blockquote: ({ node, ...props }: MarkdownComponentProps) => (
    <blockquote 
      {...props} 
      className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground" 
    />
  ),
  table: ({ node, ...props }: MarkdownComponentProps) => (
    <div className="overflow-x-auto my-2 rounded-md border border-border">
      <table {...props} className="min-w-full divide-y divide-border" />
    </div>
  ),
  thead: ({ node, ...props }: MarkdownComponentProps) => <thead {...props} className="bg-muted" />,
  tbody: ({ node, ...props }: MarkdownComponentProps) => <tbody {...props} className="divide-y divide-border" />,
  tr: ({ node, ...props }: MarkdownComponentProps) => <tr {...props} className="hover:bg-muted/50 transition-colors" />,
  th: ({ node, ...props }: MarkdownComponentProps) => (
    <th {...props} className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider" />
  ),
  td: ({ node, ...props }: MarkdownComponentProps) => <td {...props} className="px-3 py-1.5 whitespace-nowrap" />,
  img: ({ node, ...props }: MarkdownComponentProps) => {
    const [imgError, setImgError] = React.useState(false);
    
    const handleError = () => {
      console.log("Image failed to load:", props.src);
      setImgError(true);
    };
    
    // Sanitize the src attribute to prevent XSS
    const sanitizedSrc = props.src ? DOMPurify.sanitize(props.src.toString()) : '';
    
    return imgError ? (
      <div className="max-w-full p-4 text-center border border-muted rounded-md my-2 bg-muted/30">
        <p className="text-sm text-muted-foreground">Image could not be loaded</p>
        <p className="text-xs text-muted-foreground mt-1 break-all">
          {sanitizedSrc.substring(0, 50)}...
        </p>
      </div>
    ) : (
      <img 
        {...props} 
        src={sanitizedSrc}
        className="max-w-full h-auto rounded-md my-2" 
        alt={props.alt || "Image"} 
        loading="lazy"
        onError={handleError}
        crossOrigin="anonymous" 
        referrerPolicy="no-referrer"
        width={props.width || "auto"}
        height={props.height || "auto"}
      />
    );
  },
  pre: ({ node, ...props }: MarkdownComponentProps) => (
    <pre {...props} className="bg-muted p-4 rounded-md overflow-x-auto my-2" />
  ),
  code: ({ node, inline, className, ...props }: MarkdownComponentProps & { inline?: boolean }) => (
    inline ? 
      <code {...props} className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded" /> :
      <code {...props} className="block p-0 bg-transparent text-current rounded-none font-mono" />
  ),
  details: ({ node, ...props }: MarkdownComponentProps) => (
    <details {...props} className="my-2 p-2 bg-muted/50 rounded-md" />
  ),
  summary: ({ node, ...props }: MarkdownComponentProps) => (
    <summary {...props} className="cursor-pointer font-medium p-1" />
  ),
};
