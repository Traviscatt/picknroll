import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Only allow same-site relative paths ("/join?code=..."), never "//evil.com" or absolute URLs
export function safeCallbackUrl(value: string | null, fallback = "/dashboard") {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback
}
