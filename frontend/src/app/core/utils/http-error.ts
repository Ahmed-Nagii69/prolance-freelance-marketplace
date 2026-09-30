import { HttpErrorResponse } from '@angular/common/http';
import { BanInfo } from '../models/models';

/** The error code the API uses for a suspended account. */
export const ACCOUNT_BANNED = 'ACCOUNT_BANNED';

interface ErrorPayload {
  message?: string;
  error?: { code?: string };
  data?: { ban?: Partial<BanInfo> | null } | null;
}

const payloadOf = (error: unknown): ErrorPayload | undefined =>
  error instanceof HttpErrorResponse ? (error.error as ErrorPayload | undefined) : undefined;

export const extractApiMessage = (
  error: unknown,
  fallback = 'Something went wrong',
): string => payloadOf(error)?.message ?? fallback;

export const extractApiCode = (error: unknown): string =>
  payloadOf(error)?.error?.code ?? '';

/**
 * Reads the structured ban description the API attaches to an ACCOUNT_BANNED
 * response, or null when the failure was something else. Every field is
 * normalised, so the dialog can render whatever it is given without guarding.
 */
export const extractBanInfo = (error: unknown): BanInfo | null => {
  const payload = payloadOf(error);
  if (payload?.error?.code !== ACCOUNT_BANNED) {
    return null;
  }

  const ban = payload.data?.ban;
  const bannedUntil = ban?.bannedUntil ?? null;

  return {
    isBanned: true,
    reason: ban?.reason ?? null,
    bannedAt: ban?.bannedAt ?? null,
    bannedUntil,
    isPermanent: ban?.isPermanent ?? bannedUntil === null,
  };
};
