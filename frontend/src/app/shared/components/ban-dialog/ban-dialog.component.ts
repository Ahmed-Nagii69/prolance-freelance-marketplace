import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { BanDialogService } from '../../../core/services/ban-dialog.service';

/** Offered as one click each; a whole number of days between 1 and 365 also works. */
const DURATION_PRESETS = [1, 3, 7, 30];
const MAX_REASON_LENGTH = 500;

/**
 * Admin-facing ban dialog. It only decides on a duration and a reason; the
 * caller performs the request, so a ban is always an explicit admin action and
 * never a side effect of resolving something else.
 */
@Component({
  selector: 'pl-ban-dialog',
  standalone: true,
  imports: [FormsModule, TablerIconComponent],
  template: `
    @if (dialog.current(); as request) {
      <div
        class="pl-ban-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pl-ban-title"
        (click)="cancel()"
      >
        <div class="pl-ban-modal" (click)="$event.stopPropagation()">
          <p class="pl-kicker">Moderation</p>
          <h2 class="pl-h3" id="pl-ban-title">
            Suspend {{ request.target.name }}?
          </h2>
          <p class="pl-muted" style="font-size: 0.93rem">
            @if (request.context) {
              {{ request.context }}
            }
            The account is signed out immediately and cannot sign in or use any
            protected feature until the suspension ends.
          </p>

          <div class="pl-field mt-3">
            <span class="pl-label-inline">How long</span>
            <div class="pl-ban-presets">
              @for (option of presets; track option) {
                <button
                  type="button"
                  class="pl-chip"
                  [class.is-selected]="durationDays() === option"
                  (click)="choosePreset(option)"
                >
                  {{ option }} day{{ option === 1 ? '' : 's' }}
                </button>
              }
            </div>
          </div>

          <div class="pl-field">
            <label class="pl-label-inline" for="pl-ban-days">
              Custom duration in days
            </label>
            <input
              id="pl-ban-days"
              class="pl-input"
              type="number"
              min="1"
              step="1"
              [ngModel]="durationDays()"
              (ngModelChange)="durationDays.set($event)"
              placeholder="1"
            />
            <p class="pl-field-hint mb-0">
              Between {{ minDays }} and {{ maxDays }} days. Anything outside that
              range is refused by the server.
            </p>
          </div>

          <div class="pl-field">
            <label class="pl-label-inline" for="pl-ban-reason">Reason</label>
            <textarea
              id="pl-ban-reason"
              class="pl-textarea"
              maxlength="500"
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
              placeholder="Optional. Shown to the suspended member."
            ></textarea>
            <p class="pl-field-hint mb-0">
              {{ reason().length }}/{{ maxReasonLength }}
            </p>
          </div>

          @if (error(); as message) {
            <div
              class="pl-message"
              style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
              role="alert"
            >
              {{ message }}
            </div>
          }

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="pl-btn pl-btn--outline" (click)="cancel()">
              Cancel
            </button>
            <button
              type="button"
              class="pl-btn pl-btn--danger"
              [disabled]="!isValid()"
              (click)="confirm()"
            >
              <tabler-icon icon="alert-triangle" [size]="18" />
              Suspend account
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pl-ban-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1150;
        background: rgba(23, 21, 18, 0.55);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 8vh 1rem 1rem;
        overflow-y: auto;
      }

      .pl-ban-modal {
        width: min(520px, 100%);
        background: var(--pl-ivory);
        border: 1px solid var(--pl-stone);
        border-radius: var(--pl-radius-lg);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        padding: 1.8rem;
      }

      .pl-ban-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .pl-ban-presets .pl-chip {
        cursor: pointer;
      }
    `,
  ],
})
export class BanDialog {
  protected readonly dialog = inject(BanDialogService);

  protected readonly presets = DURATION_PRESETS;
  protected readonly minDays = 1;
  protected readonly maxDays = 365;
  protected readonly maxReasonLength = MAX_REASON_LENGTH;

  protected readonly durationDays = signal<number | string>(7);
  protected readonly reason = signal('');
  protected readonly error = signal('');

  // The reason is optional, so only the duration has to be valid.
  protected readonly isValid = computed(() => this.parsedDays() !== null);

  choosePreset(days: number): void {
    this.durationDays.set(days);
    this.error.set('');
  }

  confirm(): void {
    const days = this.parsedDays();
    if (days === null) {
      this.error.set(
        `Enter how many days the suspension should last, between ${this.minDays} and ${this.maxDays}.`,
      );
      return;
    }
    this.dialog.apply(days, this.reason().trim());
  }

  cancel(): void {
    this.dialog.cancel();
  }

  private parsedDays(): number | null {
    const raw = typeof this.durationDays() === 'number'
      ? this.durationDays()
      : String(this.durationDays() ?? '').trim();
    if (raw === '' || raw === null) {
      return null;
    }
    const days = Number(raw);
    if (!Number.isInteger(days) || days < this.minDays || days > this.maxDays) {
      return null;
    }
    return days;
  }
}
