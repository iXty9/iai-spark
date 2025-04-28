
export const stripMarkdown = (text: string): string => {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove bold/italic markers
    .replace(/\*\*|__|\*|_/g, '')
    // Remove headers
    .replace(/#{1,6}\s/g, '')
    // Remove bullet points and numbered lists
    .replace(/^[-*+]|\d+\.\s/gm, '')
    // Remove blockquotes
    .replace(/^\s*>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^(?:-{3,}|\*{3,}|_{3,})$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Cleanup extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};
