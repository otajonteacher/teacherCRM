import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind klasslarni xavfsiz birlashtirish (shadcn/ui standarti). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
