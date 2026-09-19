import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'pl-confirm-dialog',
  standalone: true,
  template: `
    @if (confirmService.current(); as request) {
      <div
        class="pl-modal-backdrop"
        role="dialog"
        aria-modal="true"
        (click)="onBackdrop()"
      >
        <div class="pl-modal" (click)="$event.stopPropagation()">
          <p class="pl-kicker">Please confirm</p>
          <h2 class="pl-h3">{{ request.title }}</h2>
          <p class="pl-muted" style="font-size: 0.95rem">{{ request.body }}</p>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="pl-btn pl-btn--outline" (click)="cancel()">
              Cancel
            </button>
            <button
              type="button"
              class="pl-btn"
              [class.pl-btn--danger]="request.danger"
              [class.pl-btn--accent]="!request.danger"
              (click)="accept()"
            >
              {{ request.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pl-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1100;
        background: rgba(23, 21, 18, 0.55);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 10vh 1rem 1rem;
      }

      .pl-modal {
        width: min(480px, 100%);
        background: var(--pl-ivory);
        border-radius: var(--pl-radius-lg);
        padding: 1.8rem;
        border: 1px solid var(--pl-stone);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
      }
    `,
  ],
})
export class ConfirmDialog {
  readonly confirmService = inject(ConfirmService);

  accept(): void {
    this.confirmService.accept();
  }

  cancel(): void {
    this.confirmService.cancel();
  }

  onBackdrop(): void {
    this.cancel();
  }
}