import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { extractApiCode, extractBanInfo } from '../utils/http-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // A suspension is handled first and on every route, whether the caller was
      // logged in or was on the login form: the local session is dropped, the
      // reason is kept, and the dialog explains it. Nothing downstream may treat
      // this 403 as an ordinary failure, so it is never shown as a toast.
      const ban = extractBanInfo(error);
      if (ban) {
        auth.applyBan(ban);
        return throwError(() => error);
      }

      const isAuthPage = router.url.startsWith('/auth') || router.url === '/';
      const isUnauthorizedCall =
        error.status === 401 || extractApiCode(error) === 'UNAUTHORIZED';

      if (isUnauthorizedCall && !isAuthPage && auth.isAuthenticated()) {
        auth.logout();
      }

      return throwError(() => error);
    }),
  );
};
