import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFrequency(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) {
    return "—";
  }
  return value.toExponential(3);
}
