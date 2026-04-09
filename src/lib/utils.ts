import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseImages(imageUrlString: string | null | undefined): string[] {
  if (!imageUrlString) return [];
  try {
    const parsed = JSON.parse(imageUrlString);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [imageUrlString];
  } catch (e) {
    return [imageUrlString];
  }
}
