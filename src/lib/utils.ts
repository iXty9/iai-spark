
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
