import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthFrame } from '../auth-frame/auth-frame.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiMessage } from '../../../core/utils/http-error';

type Step = 'email' | 'otp' | 'password';

@Component({
  selector: 'pl-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthFrame],
  template: `
    <pl-auth-frame>
      <p class="pl-kicker">Password recovery</p>
      <h1 class="pl-headline" style="font-size: 2rem">
        @if (step() === 'email') {
          Reset your password
        } @else if (step() === 'otp') {
          Enter the reset code
        } @else {
          Choose a new password
        }
      </h1>

      <form (ngSubmit)="submit()" novalidate>
        @if (step() === 'email') {
          <p class="pl-muted" style="font-size: 0.95rem; margin-bottom: 1.5rem">
            We'll email you a six-digit code if an account exists for this
            address.
          </p>
          <div class="pl-field">
            <label class="pl-label-inline" for="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              class="pl-input"
              required
              [(ngModel)]="email"
              name="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
          </div>
        }

        @if (step() === 'otp') {
          <p class="pl-muted" style="font-size: 0.95rem; margin-bottom: 1.5rem">
            Enter the six-digit code we emailed to
            <strong>{{ email() }}</strong
            >.
          </p>
          <div class="pl-field">
            <label class="pl-label-inline" for="fp-otp">Reset code</label>
            <input
              id="fp-otp"
              type="text"
              class="pl-input"
              required
              [(ngModel)]="otp"
              name="otp"
              placeholder="123456"
              maxlength="6"
              inputmode="numeric"
              pattern="[0-9]{6}"
            />
          </div>
        }

        @if (step() === 'password') {
          <div class="pl-field">
            <label class="pl-label-inline" for="fp-new">New password</label>
            <input
              id="fp-new"
              type="password"
              class="pl-input"
              required
              minlength="6"
              [(ngModel)]="newPassword"
              name="newPassword"
              placeholder="At least 6 characters"
              autocomplete="new-password"
            />
          </div>
        }

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
          @if (submitting()) {
            Working…
          } @else if (step() === 'email') {
            Send reset code
          } @else if (step() === 'otp') {
            Verify code
          } @else {
            Set new password
          }
        </button>
      </form>

      <div class="d-flex justify-content-between align-items-center mt-4">
        <button
          type="button"
          class="pl-faded-link"
          style="border: 0; background: none; cursor: pointer"
          (click)="back()"
        >
          ← Back
        </button>
        <a routerLink="/auth/login" class="pl-faded-link">Back to log in</a>
      </div>
    </pl-auth-frame>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly step = signal<Step>('email');
  protected readonly email = signal('');
  protected readonly otp = signal('');
  protected readonly newPassword = signal('');
  protected readonly resetAuthorization = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  submit(): void {
    const step = this.step();
    if (step === 'email') {
      this.requestCode();
    } else if (step === 'otp') {
      this.verifyCode();
    } else {
      this.setPassword();
    }
  }

  back(): void {
    if (this.step() === 'otp') {
      this.step.set('email');
      this.error.set('');
    } else if (this.step() === 'password') {
      this.step.set('otp');
      this.error.set('');
    } else {
      void this.router.navigate(['/auth/login']);
    }
  }

  private requestCode(): void {
    if (!this.email()) {
      this.error.set('A valid email is required.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.email()).subscribe({
      next: () => {
        this.step.set('otp');
        this.submitting.set(false);
        this.toast.info('If the account exists, a reset code has been sent.');
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to request a reset code.'));
        this.submitting.set(false);
      },
    });
  }

  private verifyCode(): void {
    if (!/^\d{6}$/.test(this.otp())) {
      this.error.set('Enter the six-digit code.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.verifyResetOtp(this.email(), this.otp()).subscribe({
      next: (data) => {
        this.resetAuthorization.set(data.resetAuthorization);
        this.step.set('password');
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'That code could not be verified.'));
        this.submitting.set(false);
      },
    });
  }

  private setPassword(): void {
    if (this.newPassword().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth
      .resetPassword(this.resetAuthorization(), this.newPassword())
      .subscribe({
        next: (data) => {
          this.auth.adoptToken(data.token).subscribe({
            next: () => {
              this.toast.success('Password reset. You are now logged in.');
              void this.router.navigateByUrl('/');
            },
            error: () => {
              void this.router.navigateByUrl('/auth/login');
            },
          });
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to reset your password.'));
          this.submitting.set(false);
        },
      });
  }
}