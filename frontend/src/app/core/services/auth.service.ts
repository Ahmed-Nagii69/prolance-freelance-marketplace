import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthData, BanInfo, User } from '../models/models';

const TOKEN_KEY = 'prolance_token';
const USER_KEY = 'prolance_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<User | null>(null);
  private readonly banSignal = signal<BanInfo | null>(null);

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  // Set only by an ACCOUNT_BANNED response. It survives the session being
  // cleared so the suspension can be explained instead of failing silently.
  readonly ban = computed(() => this.banSignal());
  readonly isBanned = computed(() => this.banSignal() !== null);

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const storedToken = this.readStorage(TOKEN_KEY);
    const storedUser = this.readStorage(USER_KEY);
    if (storedToken && storedUser) {
      try {
        this.tokenSignal.set(storedToken);
        this.userSignal.set(JSON.parse(storedUser) as User);
      } catch {
        this.clearSession();
      }
    }
  }

  private readStorage(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<AuthData> {
    return this.api
      .post<AuthData>('/auth/login', { email, password })
      .pipe(tap((data) => this.persist(data)));
  }

  register(payload: {
    name: string;
    email: string;
    password: string;
    role: 'CLIENT' | 'FREELANCER';
    bio?: string;
    skills?: string[];
  }): Observable<AuthData> {
    return this.api
      .post<AuthData>('/auth/register', payload)
      .pipe(tap((data) => this.persist(data)));
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<{ token: string }> {
    return this.api.patch<{ token: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  forgotPassword(email: string): Observable<null> {
    return this.api.post<null>('/auth/forgot-password', { email });
  }

  verifyResetOtp(
    email: string,
    otp: string,
  ): Observable<{ resetAuthorization: string }> {
    return this.api.post<{ resetAuthorization: string }>(
      '/auth/verify-reset-otp',
      { email, otp },
    );
  }

  resetPassword(
    resetAuthorization: string,
    newPassword: string,
  ): Observable<{ token: string }> {
    return this.api.post<{ token: string }>('/auth/reset-password', {
      resetAuthorization,
      newPassword,
    });
  }

  refreshUser(): Observable<User> {
    return this.api.get<User>('/users/profile').pipe(
      tap((user) => this.persistUser(user)),
      catchError((err) => {
        // Only an explicit 401 means the session is actually invalid. Network
        // errors, 500s and other failures must not log the user out.
        const status = (err as { status?: number })?.status;
        const code = (err as { error?: { code?: string } })?.error?.code;
        if (status === 401 || code === 'UNAUTHORIZED') {
          this.logout();
        }
        return EMPTY;
      }),
    );
  }

  private persist(data: AuthData): void {
    this.tokenSignal.set(data.token);
    this.userSignal.set(data.user);
    try {
      window.sessionStorage.setItem(TOKEN_KEY, data.token);
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      void 0;
    }
  }

  private persistUser(user: User): void {
    this.userSignal.set(user);
    try {
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      void 0;
    }
  }

  setToken(token: string): void {
    this.tokenSignal.set(token);
    try {
      window.sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      void 0;
    }
  }

  adoptUser(user: User): void {
    this.persistUser(user);
  }

  adoptToken(token: string): Observable<User> {
    this.setToken(token);
    return this.api
      .get<User>('/users/profile')
      .pipe(tap((user) => this.persistUser(user)));
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/auth/login'], {
      queryParams: { reason: 'session-expired' },
    });
  }

  /**
   * Called from the single error interceptor whenever the API answers with
   * ACCOUNT_BANNED, whether that happens on the login form or on an ordinary
   * request made by a session that is still open. The local session is dropped
   * at once so nothing keeps retrying with a token the server will refuse, but
   * the member is not navigated away: the suspension dialog explains what
   * happened first.
   */
  applyBan(ban: BanInfo): void {
    this.banSignal.set(ban);
    this.clearSession();
  }

  /** Acknowledges the suspension dialog and returns to the login form. */
  dismissBan(): void {
    if (this.banSignal() === null) {
      return;
    }
    this.banSignal.set(null);
    void this.router.navigate(['/auth/login']);
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(USER_KEY);
    } catch {
      void 0;
    }
  }

  hasRole(...roles: string[]): boolean {
    const user = this.userSignal();
    return user !== null && roles.includes(user.role);
  }
}