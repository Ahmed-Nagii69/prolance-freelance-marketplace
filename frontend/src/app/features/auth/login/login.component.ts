import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthFrame } from '../auth-frame/auth-frame.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthFrame],
  template: `
    <pl-auth-frame>
      <p class="pl-kicker">Welcome back</p>
      <h1 class="pl-headline" style="font-size: 2rem">Log in to ProLance</h1>
      <p class="pl-muted" style="margin-bottom: 2rem; font-size: 0.95rem">
        Continue to your projects, proposals and contracts.
      </p>

      <form (ngSubmit)="submit()" novalidate>
        <div class="pl-field">
          <label class="pl-label-inline" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="pl-input"
            autocomplete="email"
            required
            [(ngModel)]="email"
            name="email"
            placeholder="you@example.com"
          />
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="password">Password</label>
          <div class="position-relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              class="pl-input"
              autocomplete="current-password"
              required
              [(ngModel)]="password"
              name="password"
              placeholder="Your password"
            />
            <button
              type="button"
              class="pl-auth-eye"
              (click)="togglePassword()"
              aria-label="Toggle password visibility"
            >
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        @if (error(); as message) {
          <div
            class="pl-message mb-3"
            style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
            role="alert"
          >
            {{ message }}
          </div>
        }

        <button
          type="submit"
          class="pl-btn pl-btn--dark pl-btn--block"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <div
        class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4"
      >
        <a routerLink="/auth/forgot-password" class="pl-faded-link">
          Forgot password?
        </a>
        <a routerLink="/auth/register" class="pl-faded-link">
          Create an account
        </a>
      </div>
    </pl-auth-frame>
  `,
  styles: [
    `
      .pl-auth-eye {
        position: absolute;
        right: 0.4rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: 0;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--pl-ink-faint);
        cursor: pointer;
        padding: 0.3rem 0.5rem;
      }
    `,
  ],
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    if (!this.email() || !this.password()) {
      this.error.set('Email and password are required.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.auth.login(this.email(), this.password()).subscribe({
      next: (data) => {
        this.toast.success(`Welcome back, ${data.user.name}.`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination =
          data.user.role === 'ADMIN'
            ? '/admin'
            : returnUrl && returnUrl.startsWith('/')
              ? returnUrl
              : '/';
        void this.router.navigateByUrl(destination);
      },
      error: (err) => {
        this.error.set(
          extractApiMessage(err, 'Unable to log in. Please try again.'),
        );
        this.submitting.set(false);
      },
    });
  }
}