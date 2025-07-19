import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge class names safely
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
