import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, AlertCircle } from 'lucide-react';

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
});

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code.trim()) return;

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        setError(null);

        // Render the diagram
        const { svg } = await mermaid.render(id, code.trim());
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setRendered(false);
      }
    };

    renderDiagram();
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="not-prose my-4 rounded-lg overflow-hidden shadow-lg" style={{ backgroundColor: '#282c34' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: '#21252b' }}
      >
        <span className="text-xs font-medium text-gray-400">
          Mermaid Diagram
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors hover:bg-white/10 text-gray-400"
          title="Copy mermaid code"
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

      {/* Diagram content */}
      <div className="p-4 overflow-auto">
        {error ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400 mb-1">Failed to render diagram</p>
              <p className="text-xs text-red-300/70">{error}</p>
              <pre className="mt-3 text-xs text-gray-400 overflow-auto p-2 bg-black/20 rounded">
                {code}
              </pre>
            </div>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="mermaid-diagram flex justify-center items-center min-h-[100px]"
            style={{
              opacity: rendered ? 1 : 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MermaidBlock;
