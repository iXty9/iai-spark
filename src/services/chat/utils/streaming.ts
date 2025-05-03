
/**
 * Simple delay function for streaming simulation
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processes streaming for chat responses
 */
export async function handleStreamingResponse(
  responseText: string,
  onMessageStream: ((chunk: string) => void) | undefined,
  canceled: boolean,
  controller: AbortController | null
): Promise<string> {
  let accumulatedContent = '';
  
  if (onMessageStream) {
    // Simple streaming implementation
    const chunks = responseText.split(' ');
    for (const word of chunks) {
      if (canceled || (controller && controller.signal.aborted)) {
        throw new Error('Message streaming was canceled');
      }
      
      await delay(50); // Small delay for UI
      const chunk = word + ' ';
      accumulatedContent += chunk;
      onMessageStream(chunk);
    }
    return accumulatedContent;
  } else {
    // If no streaming callback, just use the full response
    return responseText;
  }
}
