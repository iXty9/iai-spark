
export const stripMarkdown = (text: string): string => {
  // Remove code blocks (both ``` and single `)
  text = text.replace(/```[\s\S]*?```/g, '')
             .replace(/`[^`]*`/g, '');
  
  // Remove links [text](url)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Remove bold/italic markers
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  
  // Remove headers
  text = text.replace(/#{1,6}\s+/g, '');
  
  // Remove horizontal rules
  text = text.replace(/(?:^|\n)[-*_]{3,}\s*(?:\n|$)/g, '\n');
  
  // Remove bullet points and numbered lists
  text = text.replace(/^[-*+]\s+/gm, '')
             .replace(/^\d+\.\s+/gm, '');
  
  // Remove blockquotes
  text = text.replace(/^\s*>\s+/gm, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
             .trim();
  
  return text;
};
