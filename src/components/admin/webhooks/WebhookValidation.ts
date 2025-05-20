// Update the function call to match the expected signature

export function validateWebhookUrl(url: string): boolean {
  // Use the isValidUrl function with just one argument
  const { isValidUrl } = require('@/utils/security');
  return isValidUrl(url);
}
