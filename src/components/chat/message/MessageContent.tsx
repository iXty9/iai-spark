import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { createMarkdownComponents } from '@/utils/markdown-config';
import { useTheme } from '@/contexts/SupaThemeContext';
import { extractAttachmentsFromText, isImageMime, toDataUrl, downloadAttachment, ParsedAttachment } from '@/utils/attachment-utils';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageContentProps {
  message: Message;
  isUser: boolean;
}

// Attachment preview component - displays above text for user messages
const AttachmentPreview: React.FC<{ attachments: ParsedAttachment[]; isUser: boolean }> = ({ attachments, isUser }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'mb-2' : 'mt-2'}`}>
      {attachments.map((att, idx) => (
        <div 
          key={idx} 
          className="rounded-lg overflow-hidden border border-border/50 bg-muted/30"
        >
          {isImageMime(att.mime) ? (
            // Image preview with click to expand (could add lightbox later)
            <div className="relative group">
              <img
                src={toDataUrl(att)}
                alt={att.name}
                loading="lazy"
                className="max-h-48 max-w-full object-contain bg-background rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white truncate block">{att.name}</span>
              </div>
            </div>
          ) : (
            // Non-image file badge with download option
            <div className="px-3 py-2 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.name}</p>
                <p className="text-xs text-muted-foreground">{att.mime}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => downloadAttachment(att)}
                aria-label={`Download ${att.name}`}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const MessageContent: React.FC<MessageContentProps> = ({ message, isUser }) => {
  const { currentTheme } = useTheme();
  
  // Get themed markdown components
  const markdownComponents = createMarkdownComponents(currentTheme);

  // Parse attachments and clean the content text
  const { text: cleanText, attachments } = extractAttachmentsFromText(message.content);

  // For user messages: attachments ABOVE text
  if (isUser) {
    return (
      <div>
        <AttachmentPreview attachments={attachments} isUser={true} />
        {cleanText && (
          <div className="text-sm whitespace-pre-wrap break-words text-left leading-relaxed max-w-[70ch]">
            {cleanText}
          </div>
        )}
      </div>
    );
  }

  // For AI messages: attachments BELOW text (standard order)
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {cleanText}
      </ReactMarkdown>
      <AttachmentPreview attachments={attachments} isUser={false} />
    </div>
  );
};
