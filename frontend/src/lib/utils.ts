import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type AxiosErrorShape = { response?: { data?: { message?: string; errors?: string[] } } };

export function getAxiosErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as AxiosErrorShape).response?.data;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.join(' · ');
    }
    if (data?.message) return data.message;
  }
  return fallback;
}
