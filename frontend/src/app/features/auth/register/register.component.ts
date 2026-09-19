import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthFrame } from '../auth-frame/auth-frame.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiMessage } from '../../../core/utils/http-error';
import { Role } from '../../../core/models/models';

@Component({
  selector: 'pl-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthFrame],
  template: `
    <pl-auth-frame>
      <p class="pl-kicker">Join the market</p>
      <h1 class="pl-headline" style="font-size: 2rem">Create your account</h1>
      <p class="pl-muted" style="margin-bottom: 2rem; font-size: 0.95rem">
        Choose how you want to work on ProLance.
      </p>

      <form (ngSubmit)="submit()" novalidate>
        <div class="pl-field">
          <label class="pl-label-inline" for="reg-name">Full name</label>
          <input
            id="reg-name"
            type="text"
            class="pl-input"
            required
            [(ngModel)]="form.name"
            name="name"
            placeholder="Alex Rivera"
            autocomplete="name"
          />
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            class="pl-input"
            required
            [(ngModel)]="form.email"
            name="email"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            class="pl-input"
            required
            minlength="6"
            [(ngModel)]="form.password"
            name="password"
            placeholder="At least 6 characters"
            autocomplete="new-password"
          />
          <span class="pl-hint">Between 6 and 128 characters.</span>
        </div>

        <div class="pl-field">
          <span class="pl-label-inline">I am a…</span>
          <div class="d-flex gap-3">
            <label class="pl-check">
              <input
                type="radio"
                name="role"
                [value]="'CLIENT'"
                [(ngModel)]="form.role"
              />
              Client — posting projects
            </label>
            <label class="pl-check">
              <input
                type="radio"
                name="role"
                [value]="'FREELANCER'"
                [(ngModel)]="form.role"
              />
              Freelancer — doing the work
            </label>
          </div>
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="reg-bio">Short bio (optional)</label>
          <textarea
            id="reg-bio"
            class="pl-textarea"
            style="min-height: 90px"
            [(ngModel)]="form.bio"
            name="bio"
            placeholder="A couple of sentences about you and your work."
          ></textarea>
        </div>

        <div class="pl-field">
          <label class="pl-label-inline" for="reg-skills">
            Skills (optional, comma separated)
          </label>
          <input
            id="reg-skills"
            type="text"
            class="pl-input"
            [(ngModel)]="skillsCsv"
            name="skills"
            placeholder="typescript, react, ui design"
          />
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
          class="pl-btn pl-btn--accent pl-btn--block"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Creating your account…' : 'Create account' }}
        </button>
      </form>

      <p class="pl-muted mt-4 mb-0" style="font-size: 0.88rem">
        Already have an account?
        <a routerLink="/auth/login" class="pl-faded-link">Log in</a>
      </p>
    </pl-auth-frame>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = {
    name: '',
    email: '',
    password: '',
    role: 'CLIENT' as Role,
    bio: '',
  };
  protected skillsCsv = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  submit(): void {
    const { name, email, password, role, bio } = this.form;

    if (!name.trim() || !email.trim() || !password) {
      this.error.set('Name, email and password are required.');
      return;
    }
    if (password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    const skills = this.skillsCsv
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0);

    this.submitting.set(true);
    this.error.set('');

    this.auth
      .register({
        name,
        email,
        password,
        role: role as 'CLIENT' | 'FREELANCER',
        bio,
        skills,
      })
      .subscribe({
      next: () => {
        this.toast.success('Account created. Welcome to ProLance.');
        if (role === 'FREELANCER') {
          void this.router.navigateByUrl('/profile/freelancer');
        } else {
          void this.router.navigateByUrl('/');
        }
      },
      error: (err) => {
        this.error.set(
          extractApiMessage(err, 'Unable to create your account.'),
        );
        this.submitting.set(false);
      },
    });
  }
}