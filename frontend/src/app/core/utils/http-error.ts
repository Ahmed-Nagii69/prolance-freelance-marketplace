import { HttpErrorResponse } from '@angular/common/http';

export const extractApiMessage = (
  error: unknown,
  fallback = 'Something went wrong',
): string => {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as { message?: string } | undefined;
    if (payload?.message) {
      return payload.message;
    }
  }
  return fallback;
};

export const extractApiCode = (error: unknown): string => {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as { error?: { code?: string } } | undefined;
    return payload?.error?.code ?? '';
  }
  return '';
};