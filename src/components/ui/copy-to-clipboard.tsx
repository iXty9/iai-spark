
// This is a mock/placeholder for the CopyToClipboard component
// The original_WebhookSettings.tsx file references this component but it's not in use
import React, { ReactNode } from 'react';

interface CopyToClipboardProps {
  text: string;
  children: ReactNode;
}

export function CopyToClipboard({ text, children }: CopyToClipboardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  return (
    <span onClick={handleCopy} className="cursor-pointer">
      {children}
    </span>
  );
}
