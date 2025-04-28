
import { Message } from '@/types/chat';
import { toast } from 'sonner';

export const importChat = (file: File): Promise<Message[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        // Validate that it's an array of messages with required fields
        if (!Array.isArray(jsonData)) {
          toast.error('Invalid chat file format');
          throw new Error('Invalid chat file format');
        }
        
        // Validate each message has required fields
        const validMessages = jsonData.every((msg: any) => 
          msg.id && msg.content !== undefined && msg.sender && msg.timestamp
        );
        
        if (!validMessages) {
          toast.error('Invalid message format in chat file');
          throw new Error('Invalid message format in chat file');
        }

        // Convert timestamps back to Date objects
        const messages = jsonData.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        // Show success toast
        toast.success(`Successfully imported ${messages.length} messages`);
        
        resolve(messages);
      } catch (error) {
        console.error('Failed to import chat file:', error);
        toast.error('Failed to import chat file');
        reject(error);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read chat file');
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
