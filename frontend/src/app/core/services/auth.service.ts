import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthData, User } from '../models/models';

const TOKEN_KEY = 'prolance_token';
const USER_KEY = 'prolance_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<User | null>(null);

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

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
      return window.localStorage.getItem(key);
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
      catchError(() => {
        this.logout();
        return EMPTY;
      }),
    );
  }

  private persist(data: AuthData): void {
    this.tokenSignal.set(data.token);
    this.userSignal.set(data.user);
    try {
      window.localStorage.setItem(TOKEN_KEY, data.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      void 0;
    }
  }

  private persistUser(user: User): void {
    this.userSignal.set(user);
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      void 0;
    }
  }

  setToken(token: string): void {
    this.tokenSignal.set(token);
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
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

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      void 0;
    }
  }

  hasRole(...roles: string[]): boolean {
    const user = this.userSignal();
    return user !== null && roles.includes(user.role);
  }
}