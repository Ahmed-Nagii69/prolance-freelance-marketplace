import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { initialsOf, roleDisplay } from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';
import { Role } from '../../../core/models/models';

@Component({
  selector: 'pl-profile-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Your account</p>
        <h1 class="pl-headline mb-0">Profile & settings</h1>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="row g-4">
          <div class="col-12 col-lg-4">
            <div class="pl-panel text-center">
              @if (profileImage()) {
                <img [src]="profileImage()" class="pl-avatar pl-avatar--xl" alt="" />
              } @else {
                <span class="pl-avatar pl-avatar--xl">{{ initialsOf(name()) }}</span>
              }
              <h2 class="h5 mt-3 mb-1 fw-semibold">{{ name() }}</h2>
              <p class="pl-faint mb-1" style="font-size: 0.9rem">{{ email() }}</p>
              <p class="mb-0">
                <span class="pl-tag pl-tag--dark">{{ roleDisplay(role()) }}</span>
              </p>
              @if (user()?.bio) {
                <p class="pl-muted mt-3 mb-0" style="font-size: 0.9rem">{{ user()!.bio }}</p>
              }
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <div class="pl-panel mb-4">
              <p class="pl-label mb-3">Edit profile</p>
              <form (ngSubmit)="saveProfile()" novalidate>
                <div class="pl-field">
                  <label class="pl-label-inline" for="pp-name">Full name</label>
                  <input
                    id="pp-name"
                    type="text"
                    class="pl-input"
                    required
                    maxlength="120"
                    [(ngModel)]="name"
                    name="name"
                  />
                </div>
                <div class="pl-field">
                  <label class="pl-label-inline" for="pp-image">Profile image URL</label>
                  <input
                    id="pp-image"
                    type="url"
                    class="pl-input"
                    maxlength="1000"
                    [(ngModel)]="profileImage"
                    name="profileImage"
                    placeholder="https://…"
                  />
                </div>
                <div class="pl-field">
                  <label class="pl-label-inline" for="pp-bio">Bio</label>
                  <textarea
                    id="pp-bio"
                    class="pl-textarea"
                    maxlength="2000"
                    [(ngModel)]="bio"
                    name="bio"
                    rows="4"
                    placeholder="What do you do?"
                  ></textarea>
                </div>
                <div class="pl-field">
                  <label class="pl-label-inline" for="pp-skills">Skills (comma separated, lowercase)</label>
                  <input
                    id="pp-skills"
                    type="text"
                    class="pl-input"
                    [(ngModel)]="skillsCsv"
                    name="skills"
                    placeholder="typescript, ui design, node"
                  />
                </div>
                @if (profileError(); as message) {
                  <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                    {{ message }}
                  </div>
                }
                <button
                  type="submit"
                  class="pl-btn pl-btn--accent"
                  [disabled]="profileSaving()"
                >
                  {{ profileSaving() ? 'Saving…' : 'Save profile' }}
                </button>
              </form>
            </div>

            <div class="pl-panel mb-4">
              <p class="pl-label mb-3">Change password</p>
              <form (ngSubmit)="changePassword()" novalidate>
                <div class="row g-3">
                  <div class="col-12 col-sm-6">
                    <div class="pl-field">
                      <label class="pl-label-inline" for="pp-current">Current password</label>
                      <input
                        id="pp-current"
                        type="password"
                        class="pl-input"
                        required
                        autocomplete="current-password"
                        [(ngModel)]="currentPassword"
                        name="currentPassword"
                      />
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <div class="pl-field">
                      <label class="pl-label-inline" for="pp-new">New password</label>
                      <input
                        id="pp-new"
                        type="password"
                        class="pl-input"
                        required
                        minlength="6"
                        autocomplete="new-password"
                        [(ngModel)]="newPassword"
                        name="newPassword"
                      />
                    </div>
                  </div>
                </div>
                @if (passwordError(); as message) {
                  <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                    {{ message }}
                  </div>
                }
                <button
                  type="submit"
                  class="pl-btn pl-btn--dark"
                  [disabled]="passwordSaving()"
                >
                  {{ passwordSaving() ? 'Updating…' : 'Update password' }}
                </button>
              </form>
            </div>

            <div class="pl-panel" style="border-color: rgba(105,68,81,.45)">
              <p class="pl-label mb-2" style="color: var(--pl-burgundy)">Danger zone</p>
              <p class="pl-muted mb-3" style="font-size: 0.9rem">
                Deleting your account removes your profile, projects, proposals,
                contracts, services and messages. This cannot be undone.
              </p>
              <button
                type="button"
                class="pl-btn pl-btn--danger pl-btn--sm"
                (click)="deleteAccount()"
                [disabled]="deleting()"
              >
                {{ deleting() ? 'Deleting…' : 'Delete my account' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ProfileHome {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly user = this.auth.user;

  protected readonly name = signal('');
  protected readonly bio = signal('');
  protected readonly profileImage = signal('');
  protected readonly skillsCsv = signal('');
  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal('');

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly passwordSaving = signal(false);
  protected readonly passwordError = signal('');

  protected readonly deleting = signal(false);

  protected readonly email = computed<string>(() => this.user()?.email ?? '');
  protected readonly role = computed<Role>(() => this.user()?.role ?? 'CLIENT');
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;

  constructor() {
    this.auth.refreshUser().subscribe({
      next: () => this.syncFromUser(),
      error: () => void 0,
    });
  }

  private syncFromUser(): void {
    const current = this.user();
    if (!current) return;
    this.name.set(current.name);
    this.bio.set(current.bio);
    this.profileImage.set(current.profileImage);
    this.skillsCsv.set(current.skills.join(', '));
  }

  saveProfile(): void {
    const name = this.name().trim();
    if (!name) {
      this.profileError.set('Your name is required.');
      return;
    }
    const payload = {
      name,
      bio: this.bio(),
      profileImage: this.profileImage(),
      skills: this.skillsCsv()
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0),
    };
    this.profileSaving.set(true);
    this.profileError.set('');
    this.userService.updateProfile(payload).subscribe({
      next: (user) => {
        this.auth.adoptUser(user);
        this.toast.success('Profile saved.');
        this.profileSaving.set(false);
      },
      error: (err) => {
        this.profileError.set(extractApiMessage(err, 'Unable to save your profile.'));
        this.profileSaving.set(false);
      },
    });
  }

  changePassword(): void {
    const currentPassword = this.currentPassword();
    const newPassword = this.newPassword();
    if (!currentPassword || newPassword.length < 6) {
      this.passwordError.set('Enter your current password and a new password of at least 6 characters.');
      return;
    }
    this.passwordSaving.set(true);
    this.passwordError.set('');
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.toast.success('Password updated.');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.passwordSaving.set(false);
      },
      error: (err) => {
        this.passwordError.set(extractApiMessage(err, 'Unable to change your password.'));
        this.passwordSaving.set(false);
      },
    });
  }

  deleteAccount(): void {
    this.confirm
      .confirm({
        title: 'Delete your account?',
        body: 'All of your data will be permanently removed. This cannot be undone.',
        confirmLabel: 'Delete my account',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.deleting.set(true);
        this.userService.deleteAccount().subscribe({
          next: () => {
            this.toast.success('Your account has been deleted.');
            this.auth.logout();
          },
          error: (err) => {
            this.toast.error(extractApiMessage(err, 'Unable to delete your account.'));
            this.deleting.set(false);
          },
        });
      });
  }
}