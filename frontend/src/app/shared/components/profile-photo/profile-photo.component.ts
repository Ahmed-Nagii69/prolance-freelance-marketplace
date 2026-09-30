import { Component, computed, inject, output, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { initialsOf } from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-profile-photo',
  standalone: true,
  template: `
    <div class="d-flex align-items-center gap-3 flex-wrap mb-2">
      @if (image()) {
        <img [src]="image()" class="pl-avatar pl-avatar--xl" alt="" />
      } @else {
        <span class="pl-avatar pl-avatar--xl">{{ initialsOf(name()) }}</span>
      }
      <div class="d-flex flex-column gap-2 align-items-start">
        <button
          type="button"
          class="pl-btn pl-btn--dark pl-btn--sm"
          (click)="photoInput.click()"
          [disabled]="uploading()"
        >
          {{ uploading() ? 'Uploading…' : 'Choose photo' }}
        </button>
        @if (image()) {
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
    @if (error(); as message) {
      <div class="pl-message" style="color: var(--pl-burgundy)" role="alert">
        {{ message }}
      </div>
    }
  `,
})
export class ProfilePhoto {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  /** Emits the stored photo URL, or an empty string once removed. */
  readonly imageChange = output<string>();

  protected readonly initialsOf = initialsOf;
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly image = signal(this.auth.user()?.profileImage ?? '');
  protected readonly name = computed(() => this.auth.user()?.name ?? '');

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Please choose an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.error.set('Image must be 3 MB or smaller.');
      return;
    }
    this.error.set('');
    this.uploading.set(true);
    this.userService.uploadProfilePhoto(file).subscribe({
      next: (user) => {
        this.auth.adoptUser(user);
        this.apply(user.profileImage);
        this.uploading.set(false);
        this.toast.success('Profile photo updated.');
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to upload your photo.'));
        this.uploading.set(false);
      },
    });
  }

  removePhoto(): void {
    this.error.set('');
    this.userService.updateProfile({ profileImage: '' }).subscribe({
      next: (user) => {
        this.auth.adoptUser(user);
        this.apply('');
        this.toast.success('Profile photo removed.');
      },
      error: (err) => {
        this.error.set(extractApiMessage(err, 'Unable to remove your photo.'));
      },
    });
  }

  private apply(value: string): void {
    this.image.set(value);
    this.imageChange.emit(value);
  }
}
