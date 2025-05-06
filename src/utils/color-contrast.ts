
/**
 * Utility functions for color contrast validation
 * Based on WCAG 2.0 guidelines
 */

// Convert hex color to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle shorthand hex codes
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

// Calculate relative luminance
export function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  
  // Convert RGB to relative luminance values
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  // Calculate luminance according to WCAG formula
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  // Calculate contrast ratio according to WCAG formula
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
export function meetsContrastStandard(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// Suggest better color for accessibility
export function suggestAccessibleColor(
  color: string, 
  background: string, 
  isLargeText: boolean = false
): string {
  if (meetsContrastStandard(color, background, isLargeText)) {
    return color; // Color already meets standards
  }
  
  const rgb = hexToRgb(color);
  const bgLuminance = getLuminance(background);
  
  // Determine if we need to lighten or darken the color
  const shouldLighten = bgLuminance < 0.5;
  
  // Get the minimum required contrast
  const targetRatio = isLargeText ? 3 : 4.5;
  
  // Step size for adjustments
  const step = shouldLighten ? 5 : -5;
  let adjustedColor = color;
  let attempts = 0;
  const maxAttempts = 50;
  
  // Adjust color until we meet the contrast requirement or reach max attempts
  while (!meetsContrastStandard(adjustedColor, background, isLargeText) && attempts < maxAttempts) {
    const adjustedRgb = hexToRgb(adjustedColor);
    
    // Adjust RGB values
    const r = Math.min(255, Math.max(0, adjustedRgb.r + step));
    const g = Math.min(255, Math.max(0, adjustedRgb.g + step));
    const b = Math.min(255, Math.max(0, adjustedRgb.b + step));
    
    // Convert back to hex
    adjustedColor = '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');
    
    attempts++;
  }
  
  return adjustedColor;
}

// Get WCAG rating (AAA, AA, or Fail)
export function getContrastRating(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): 'AAA' | 'AA' | 'Fail' {
  const ratio = getContrastRatio(foreground, background);
  
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'Fail';
  } else {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'Fail';
  }
}

// Format contrast ratio for display
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
