
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat';

interface ImportChatButtonProps {
  onImport: (messages: Message[]) => void;
}

export const ImportChatButton: React.FC<ImportChatButtonProps> = ({ onImport }) => {
  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const text = await file.text();
        try {
          const messages = JSON.parse(text);
          
          // Validate that this is an array of messages with required properties
          if (!Array.isArray(messages) || !messages.every(m => 
            m.id && m.content && m.sender && m.timestamp)) {
            throw new Error('Invalid chat file format');
          }
          
          // Convert timestamp strings back to Date objects
          const parsedMessages = messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          
          onImport(parsedMessages);
          toast.success('Chat history imported successfully');
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to import chat. Please check the file format.');
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import chat');
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2" 
      onClick={handleImport}
    >
      <Upload className="h-4 w-4" />
      Import Chat
    </Button>
  );
};
