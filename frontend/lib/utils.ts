import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get download URL for Cloudinary documents with proper filename
 * Adds fl_attachment flag to force browser to download with correct extension
 */
export function getDownloadUrl(url: string, filename?: string): string {
  if (!url) return url;
  
  // If URL already has fl_attachment, return as-is
  if (url.includes('fl_attachment')) {
    return url;
  }
  
  // Add fl_attachment flag for proper download with filename
  if (filename) {
    // URL encode the filename for safety
    const safeFilename = encodeURIComponent(filename);
    return url.replace('/upload/', `/upload/fl_attachment:${safeFilename}/`);
  }
  
  // Just add fl_attachment without custom filename
  return url.replace('/upload/', '/upload/fl_attachment/');
}

/**
 * Check if a URL points to a PDF file
 */
export function isPdfUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('/raw/') || url.toLowerCase().endsWith('.pdf');
}
