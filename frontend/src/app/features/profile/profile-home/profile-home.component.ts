import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { WalletService } from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import {
  formatCurrency,
  formatDateTime,
  initialsOf,
  roleDisplay,
} from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';
import { Role, WalletData } from '../../../core/models/models';

@Component({
  selector: 'pl-profile-home',
  standalone: true,
  imports: [FormsModule, RouterLink],
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
            </div>

            @if (role() === 'FREELANCER') {
              <div class="pl-panel mt-4">
                <p class="pl-label mb-1">Freelancer profile</p>
                <p class="pl-muted" style="font-size: 0.9rem">
                  Manage the headline, hourly rate and skills shown on your
                  public profile.
                </p>
                <a routerLink="/profile/freelancer" class="pl-btn pl-btn--dark pl-btn--sm">
                  Edit freelancer profile
                </a>
              </div>
            }

            <div class="pl-panel mt-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <p class="pl-label mb-0">Wallet</p>
                @if (walletLoading()) {
                  <span class="pl-faint" style="font-size: 0.8rem">Loading…</span>
                }
              </div>
              <p
                class="mb-0"
                style="font-family: var(--pl-font-display); font-size: 2.1rem; line-height: 1.1"
              >
                {{ formatCurrency(wallet()?.balance ?? 0) }}
              </p>
              <p class="pl-faint" style="font-size: 0.85rem">Available balance</p>

              @if (role() === 'CLIENT') {
                <form (ngSubmit)="fundWallet()" novalidate>
                  <div class="d-flex gap-2">
                    <input
                      type="number"
                      class="pl-input"
                      min="1"
                      [(ngModel)]="fundAmount"
                      name="fundAmount"
                      placeholder="Amount (USD)"
                      aria-label="Amount to add"
                    />
                    <button
                      type="submit"
                      class="pl-btn pl-btn--dark"
                      [disabled]="fundSaving()"
                    >
                      {{ fundSaving() ? 'Adding…' : 'Add funds' }}
                    </button>
                  </div>
                  @if (walletError(); as message) {
                    <div
                      class="pl-message mt-2"
                      style="color: var(--pl-burgundy)"
                      role="alert"
                    >
                      {{ message }}
                    </div>
                  }
                  <p class="pl-field-hint mt-2">
                    Funds are held in escrow when you accept a proposal and are
                    released to the freelancer once the work is approved.
                  </p>
                </form>
              }

              @if (recentTransactions().length > 0) {
                <div class="mt-3">
                  <p class="pl-label mb-1">Recent activity</p>
                  <ul class="list-unstyled mb-0">
                    @for (tx of recentTransactions(); track tx._id) {
                      <li class="pl-tx">
                        <div class="pl-tx__meta">
                          <span class="pl-tx__desc">{{ tx.description }}</span>
                          <span class="pl-tx__time">{{ formatDateTime(tx.createdAt) }}</span>
                        </div>
                        <span
                          class="pl-tx__amount"
                          [class.is-credit]="tx.type === 'CREDIT'"
                        >
                          {{ tx.type === 'CREDIT' ? '+' : '−' }}{{ formatCurrency(tx.amount) }}
                        </span>
                      </li>
                    }
                  </ul>
                </div>
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
                  <label class="pl-label-inline">Profile photo</label>
                  <div class="d-flex align-items-center gap-3 flex-wrap mb-2">
                    @if (profileImage()) {
                      <img [src]="profileImage()" class="pl-avatar pl-avatar--xl" alt="" />
                    } @else {
                      <span class="pl-avatar pl-avatar--xl">{{ initialsOf(name()) }}</span>
                    }
                    <div class="d-flex flex-column gap-2 align-items-start">
                      <button
                        type="button"
                        class="pl-btn pl-btn--dark pl-btn--sm"
                        (click)="photoInput.click()"
                        [disabled]="photoUploading()"
                      >
                        {{ photoUploading() ? 'Uploading…' : 'Choose photo' }}
                      </button>
                      @if (profileImage()) {
                        <button
                          type="button"
                          class="pl-btn pl-btn--danger pl-btn--sm"
                          (click)="removePhoto()"
                        >
                          Remove photo
                        </button>
                      }
                    </div>
                    <input
                      #photoInput
                      class="d-none"
                      type="file"
                      accept="image/*"
                      (change)="onPhotoSelected($event)"
                    />
                  </div>
                  @if (photoError(); as message) {
                    <div class="pl-message" style="color: var(--pl-burgundy)" role="alert">
                      {{ message }}
                    </div>
                  }
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
                contracts, messages and reviews. This cannot be undone.
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
  private readonly walletService = inject(WalletService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly user = this.auth.user;

  protected readonly name = signal('');
  protected readonly profileImage = signal('');
  protected readonly skillsCsv = signal('');
  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal('');
  protected readonly photoUploading = signal(false);
  protected readonly photoError = signal('');

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly passwordSaving = signal(false);
  protected readonly passwordError = signal('');

  protected readonly deleting = signal(false);

  protected readonly wallet = signal<WalletData | null>(null);
  protected readonly walletLoading = signal(false);
  protected readonly walletError = signal('');
  protected readonly fundAmount = signal<number | string>('');
  protected readonly fundSaving = signal(false);

  protected readonly email = computed<string>(() => this.user()?.email ?? '');
  protected readonly role = computed<Role>(() => this.user()?.role ?? 'CLIENT');
  protected readonly recentTransactions = computed(() =>
    this.wallet()?.transactions.slice(0, 5) ?? [],
  );
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;

  constructor() {
    this.auth.refreshUser().subscribe({
      next: () => {
        this.syncFromUser();
        this.loadWallet();
      },
      error: () => void 0,
    });
  }

  private loadWallet(): void {
    this.walletLoading.set(true);
    this.walletError.set('');
    this.walletService.getWallet().subscribe({
      next: (data) => {
        this.wallet.set(data);
        this.walletLoading.set(false);
      },
      error: () => {
        this.walletLoading.set(false);
      },
    });
  }

  fundWallet(): void {
    const amount = Number(this.fundAmount());
    if (!Number.isFinite(amount) || amount <= 0) {
      this.walletError.set('Enter a positive amount to add to your wallet.');
      return;
    }
    this.fundSaving.set(true);
    this.walletError.set('');
    this.walletService.fundWallet(amount).subscribe({
      next: () => {
        this.fundAmount.set('');
        this.fundSaving.set(false);
        this.toast.success('Funds added to your wallet.');
        this.loadWallet();
      },
      error: (err) => {
        this.walletError.set(
          extractApiMessage(err, 'Unable to add funds to your wallet.'),
        );
        this.fundSaving.set(false);
      },
    });
  }

  private syncFromUser(): void {
    const current = this.user();
    if (!current) return;
    this.name.set(current.name);
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

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.photoError.set('Please choose an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.photoError.set('Image must be 3 MB or smaller.');
      return;
    }
    this.photoError.set('');
    this.photoUploading.set(true);
    this.userService.uploadProfilePhoto(file).subscribe({
      next: (user) => {
        this.auth.adoptUser(user);
        this.profileImage.set(user.profileImage);
        this.photoUploading.set(false);
        this.toast.success('Profile photo updated.');
      },
      error: (err) => {
        this.photoError.set(extractApiMessage(err, 'Unable to upload your photo.'));
        this.photoUploading.set(false);
      },
    });
  }

  removePhoto(): void {
    this.photoError.set('');
    this.userService.updateProfile({ profileImage: '' }).subscribe({
      next: (user) => {
        this.auth.adoptUser(user);
        this.profileImage.set('');
        this.toast.success('Profile photo removed.');
      },
      error: (err) => {
        this.photoError.set(extractApiMessage(err, 'Unable to remove your photo.'));
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
    if (currentPassword === newPassword) {
      this.passwordError.set('Your new password must be different from your current password.');
      return;
    }
    this.passwordSaving.set(true);
    this.passwordError.set('');
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: (data) => {
        this.auth.setToken(data.token);
        this.toast.success('Password updated. Your session was refreshed.');
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