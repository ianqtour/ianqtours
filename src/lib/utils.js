import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function formatDuration(d) {
  if (!d) return '';
  const val = String(d).trim();
  if (/^\d+$/.test(val)) {
    const num = parseInt(val, 10);
    return `${num} ${num === 1 ? 'dia' : 'dias'}`;
  }
  return d;
}