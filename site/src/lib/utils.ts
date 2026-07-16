import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class lists (clsx) and dedupe conflicting Tailwind
 * utility classes (tailwind-merge). Standard shadcn/ui helper — added in
 * Phase 0 as groundwork for later component ports (spec section 4.2:
 * "Radix primitives + CVA to Astro components with class:list").
 *
 * No component has been ported yet; this is purely the dependency + helper
 * that later phases will import.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
