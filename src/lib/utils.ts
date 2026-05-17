import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  return `${hours}h ${minutes}m ${seconds}s`;
}

export function formatDistance(km: number) {
  return `${km.toFixed(2)} km`;
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  const options: Intl.NumberFormatOptions = { style: 'currency', currency };
  try {
    return new Intl.NumberFormat('en-US', options).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
