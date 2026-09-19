import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

interface ErrorPayload {
  error?: { code?: string };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const payload = error.error as ErrorPayload | undefined;
      const code = payload?.error?.code;

      const isAuthPage = router.url.startsWith('/auth') || router.url === '/';
      const isUnauthorizedCall =
        code === 'UNAUTHORIZED' || error.status === 401;

      if (isUnauthorizedCall && !isAuthPage && auth.isAuthenticated()) {
        auth.logout();
      }

      return throwError(() => error);
    }),
  );
};