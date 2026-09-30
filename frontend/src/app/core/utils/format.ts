import { Role, User } from '../models/models';

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const clientOf = (project: {
  client: User | string;
}): User | string => project.client;

export const isClientUser = (value: User | string): value is User =>
  typeof value === 'object' && value !== null && '_id' in value;

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Renders a project budget as a range. A project whose two bounds are equal (or
 * where only one bound reached the client) reads as a single figure, so a
 * one-number range is never shown as a redundant "500 - 500".
 */
export const formatCurrencyRange = (
  min: number | null | undefined,
  max: number | null | undefined,
): string => {
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);
  if (hasMin && hasMax) {
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  if (hasMax) return `Up to ${formatCurrency(max)}`;
  if (hasMin) return `From ${formatCurrency(min)}`;
  return '—';
};

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const daysUntil = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

export const deadlineLabel = (value: string | Date | null | undefined): string => {
  const days = daysUntil(value);
  if (days === null) return '—';
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
};

export const humanizeStatus = (status: string): string =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const timeAgo = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const roleDisplay = (role: Role): string =>
  role.charAt(0) + role.slice(1).toLowerCase();

/**
 * A short, human description of how long a suspension still has to run, for the
 * dialog a suspended member sees. Returns null for a permanent ban or an
 * unparseable date, so the caller can decide not to show an expiry at all.
 */
export const banWindowLabel = (bannedUntil: string | null): string | null => {
  if (!bannedUntil) {
    return null;
  }
  const end = new Date(bannedUntil);
  if (Number.isNaN(end.getTime())) {
    return null;
  }

  const remainingMs = end.getTime() - Date.now();
  if (remainingMs <= 0) {
    return 'the suspension has just ended';
  }

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours < 24) {
    const hours = Math.max(1, totalHours);
    return hours === 1 ? 'for about 1 more hour' : `for about ${hours} more hours`;
  }

  const days = Math.ceil(totalHours / 24);
  return days === 1 ? 'for about 1 more day' : `for about ${days} more days`;
};

export const greeting = (name: string): string => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning`;
  if (hour < 18) return `Good afternoon`;
  return `Good evening`;
};