
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { createMarkdownComponents } from '@/utils/markdown-config';
import { useTheme } from '@/contexts/SupaThemeContext';
import { extractAttachmentsFromText, isImageMime, toDataUrl } from '@/utils/attachment-utils';

interface MessageContentProps {
  message: Message;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ message, isUser }) => {
  const { currentTheme } = useTheme();
  
  // Get themed markdown components
  const markdownComponents = createMarkdownComponents(currentTheme);

  // Parse attachments and clean the content text
  const { text: cleanText, attachments } = extractAttachmentsFromText(message.content);

  const Attachments = () => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="mt-2 flex flex-col gap-2">
        {attachments.map((att, idx) => (
          <div key={idx} className="rounded-lg overflow-hidden border border-border/50 bg-muted/30">
            {isImageMime(att.mime) ? (
              <img
                src={toDataUrl(att)}
                alt={att.name}
                loading="lazy"
                className="max-h-56 w-full object-contain bg-background"
              />
            ) : (
              <div className="px-3 py-2 text-sm flex items-center gap-2">
                <span className="font-medium">{att.name}</span>
                <span className="text-muted-foreground">({att.mime})</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isUser) {
    return (
      <div className="text-sm whitespace-pre-wrap break-words">
        {cleanText}
        <Attachments />
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {cleanText}
      </ReactMarkdown>
      <Attachments />
    </div>
  );
};
