import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function undefinedToNull<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(undefinedToNull) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        val === undefined ? null : undefinedToNull(val),
      ])
    ) as T;
  }

  return value;
}