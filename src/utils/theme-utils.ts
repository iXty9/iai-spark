
/**
 * Theme utility functions
 * Simple utilities for theme operations
 */

export const reloadTheme = () => {
  // Simple theme reload - just refresh the page for now
  // This is a simplified version to avoid complex theme management
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const handleReloadTheme = reloadTheme;
