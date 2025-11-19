import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currencyKey: string = 'MZN', locale: string = 'pt-MZ') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyKey,
  }).format(value);
}