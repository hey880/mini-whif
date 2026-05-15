import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatNumber(num: number): string {
  return num?.toLocaleString('ko-KR');
}

/**
 * Replace placeholders in message text
 *
 * @param text - Text with placeholders
 * @param userName - User/persona name (replaces {{user}})
 * @param characterName - Character name (replaces {{char}})
 */
export function replacePlaceholders(
  text: string,
  userName?: string,
  characterName?: string
): string {
  let result = text;

  if (userName) {
    result = result.replace(/\{\{user\}\}/gi, userName);
  }

  if (characterName) {
    result = result.replace(/\{\{char\}\}/gi, characterName);
  }

  return result;
}
