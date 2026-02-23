import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function generateInviteToken(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
}

export function calculateAverageScore(scores: (number | null)[]): number {
  const valid = scores.filter((s): s is number => s !== null && s !== undefined);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getRecommendationColor(rec: string | null): string {
  switch (rec) {
    case 'strong_hire': return 'text-emerald-400';
    case 'hire': return 'text-blue-400';
    case 'maybe': return 'text-amber-400';
    case 'no_hire': return 'text-red-400';
    default: return 'text-white/40';
  }
}
