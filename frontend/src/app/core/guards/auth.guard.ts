import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: router.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (!auth.isAuthenticated()) {
    return true;
  }

  if (user?.role === 'ADMIN') {
    return router.createUrlTree(['/admin']);
  }
  return router.createUrlTree(['/']);
};

export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: router.url },
      });
    }

    if (user && roles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};