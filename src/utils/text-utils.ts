export const stripMarkdown = (text: string): string => {
  return text
    // Remove code blocks with their content
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    // Remove inline code but keep content
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold/italic markers but keep content
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/__([^_]+)__/g, '$1') // Bold with underscores
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/_([^_]+)_/g, '$1') // Italic with underscores
    // Remove headers but keep content
    .replace(/^#{1,6}\s+(.*?)$/gm, '$1')
    // Remove bullet points but keep content
    .replace(/^[-*+]\s+(.*?)$/gm, '$1')
    // Remove numbered lists but keep content
    .replace(/^\d+\.\s+(.*?)$/gm, '$1')
    // Remove blockquotes but keep content
    .replace(/^\s*>\s*(.*?)$/gm, '$1')
    // Remove horizontal rules
    .replace(/^(?:-{3,}|\*{3,}|_{3,})$/gm, '')
    // Remove HTML tags but keep content
    .replace(/<[^>]*>([^<]*)<\/[^>]*>/g, '$1')
    .replace(/<[^>]*>/g, '')
    // Remove URLs but keep link text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Replace multiple newlines with single newline
    .replace(/\n{3,}/g, '\n\n')
    // Cleanup extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

export function formatSmartTimestamp(timestamp: string): string {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  // If within 24 hours, show exact time
  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // If older, show days ago
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return '1d ago';
  }
  return `${diffInDays}d ago`;
}
