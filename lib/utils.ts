import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [imageUrl];
  } catch (e) {
    // If not JSON, it's a single URL string or comma-separated string
    if (imageUrl.includes(',')) {
      return imageUrl.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [imageUrl];
  }
}
