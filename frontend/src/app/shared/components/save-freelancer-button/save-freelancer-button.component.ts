import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';
import { SavedFreelancerService } from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'pl-save-freelancer',
  standalone: true,
  imports: [TablerIconComponent],
  template: `
    <button
      type="button"
      class="pl-save-btn"
      [class.is-saved]="saved()"
      [class.is-busy]="busy()"
      [disabled]="busy()"
      (click)="toggle($event)"
      [attr.aria-pressed]="saved()"
      [attr.aria-label]="label()"
      [title]="label()"
    >
      <tabler-icon [icon]="saved() ? 'heart-filled' : 'heart'" [size]="size()" />
    </button>
  `,
})
export class SaveFreelancerButton {
  private readonly savedService = inject(SavedFreelancerService);
  private readonly toast = inject(ToastService);

  readonly freelancerId = input.required<string>();
  readonly size = input<number>(18);
  // Lets a list render an already saved freelancer without waiting for the
  // status request.
  readonly initialSaved = input<boolean | undefined>(undefined);
  readonly savedChange = output<boolean>();

  readonly saved = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    effect(() => {
      const freelancerId = this.freelancerId();
      const initialSaved = this.initialSaved();
      untracked(() => {
        this.saved.set(initialSaved ?? false);
        if (initialSaved === true) {
          return;
        }
        this.loadStatus(freelancerId);
      });
    });
  }

  protected label(): string {
    return this.saved()
      ? 'Remove from saved freelancers'
      : 'Save freelancer';
  }

  private loadStatus(freelancerId: string): void {
    this.savedService.getSavedStatus(freelancerId).subscribe({
      next: (data) => this.saved.set(data.saved),
      error: () => this.saved.set(false),
    });
  }

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.busy()) {
      return;
    }

    const wasSaved = this.saved();
    this.busy.set(true);
    this.saved.set(!wasSaved);

    const onDone = (): void => {
      this.busy.set(false);
      this.toast.success(
        wasSaved
          ? 'Removed from your saved freelancers'
          : 'Saved to your freelancers',
      );
      this.savedChange.emit(!wasSaved);
    };
    const onError = (): void => {
      this.busy.set(false);
      this.saved.set(wasSaved);
      this.toast.error(
        wasSaved
          ? 'Could not remove this freelancer'
          : 'Could not save this freelancer',
      );
    };

    if (wasSaved) {
      this.savedService.unsave(this.freelancerId()).subscribe({
        next: onDone,
        error: onError,
      });
      return;
    }

    this.savedService.save(this.freelancerId()).subscribe({
      next: onDone,
      error: onError,
    });
  }
}
