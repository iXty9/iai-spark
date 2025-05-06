
/**
 * Utility functions for optimizing images before storing or displaying
 */

// Options for image optimization
interface ImageOptimizerOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

// Default optimization options
const defaultOptions: ImageOptimizerOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'image/jpeg'
};

/**
 * Compresses and resizes an image file before storing
 * 
 * @param file - The image file to optimize
 * @param options - Optimization options
 * @returns A promise that resolves to the optimized image data URL
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizerOptions = {}
): Promise<string> {
  // Merge with default options
  const settings = { ...defaultOptions, ...options };

  // Create a promise to handle the image processing
  return new Promise((resolve, reject) => {
    // Create image element to load the file
    const img = new Image();
    const reader = new FileReader();

    // When file is loaded into reader
    reader.onload = (event) => {
      if (!event.target?.result) {
        reject(new Error('Failed to read file'));
        return;
      }

      // When image is loaded
      img.onload = () => {
        try {
          // Calculate dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (settings.maxWidth && width > settings.maxWidth) {
            height = (height * settings.maxWidth) / width;
            width = settings.maxWidth;
          }
          
          if (settings.maxHeight && height > settings.maxHeight) {
            width = (width * settings.maxHeight) / height;
            height = settings.maxHeight;
          }
          
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL with compression
          const dataUrl = canvas.toDataURL(settings.format || 'image/jpeg', settings.quality || 0.8);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Set image source to loaded file
      img.src = event.target.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // Read the file
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a blurred thumbnail for use during image loading
 */
export async function generateImageThumbnail(
  imageUrl: string,
  size: number = 20
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create small canvas for thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = (size * img.height) / img.width;
        
        // Draw small version
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Create low quality thumbnail
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.1);
        resolve(thumbnailUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Estimates the file size of a data URL
 */
export function estimateDataUrlSize(dataUrl: string): number {
  // Remove the mime type and base64 prefix
  const base64 = dataUrl.split(',')[1];
  // Base64 has a 4:3 ratio of characters to bytes
  return Math.round((base64.length * 3) / 4);
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
