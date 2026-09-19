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

export const formatDate = (value: string | Date | undefined): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (value: string | Date | undefined): string => {
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

export const daysUntil = (value: string | Date | undefined): number | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

export const deadlineLabel = (value: string | Date | undefined): string => {
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

export const timeAgo = (value: string | Date | undefined): string => {
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

export const greeting = (name: string): string => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning`;
  if (hour < 18) return `Good afternoon`;
  return `Good evening`;
};