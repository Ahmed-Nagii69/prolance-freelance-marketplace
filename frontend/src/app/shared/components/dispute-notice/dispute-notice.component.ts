import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { DisputeNoticeService } from '../../../core/services/dispute-notice.service';
import { formatDateTime } from '../../../core/utils/format';

/**
 * Shown once when a reader lands on a project that is under dispute. It is
 * informational on purpose: it reports who opened the case and why, and the only
 * thing it offers is a way through to the full case file. Every action that
 * would move the contract forward is refused by the server while a dispute is
 * active, so nothing here can be used to work around that.
 */
@Component({
  selector: 'pl-dispute-notice',
  standalone: true,
  imports: [RouterLink, TablerIconComponent],
  template: `
    @if (dialog.current(); as notice) {
      <div
        class="pl-notice-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pl-dispute-title"
        aria-describedby="pl-dispute-body"
        (click)="close()"
      >
        <div class="pl-notice-modal" (click)="$event.stopPropagation()">
          <p class="pl-kicker">
            {{ notice.status === 'OPEN' ? 'Dispute opened' : 'Under review' }}
          </p>
          <h2 class="pl-h3" id="pl-dispute-title">
            This project is frozen while a dispute is settled
          </h2>
          <p class="pl-muted" id="pl-dispute-body" style="font-size: 0.93rem">
            {{ notice.raisedByName }} opened a dispute on
            "{{ notice.projectTitle }}" on {{ formatDateTime(notice.openedAt) }}. A
            ProLance admin reviews the case and decides how the held payment is
            settled. Nothing further can be submitted, approved or cancelled
            until then.
          </p>

          <div class="pl-notice-reason">
            <p class="pl-label-inline mb-1">Stated reason</p>
            <p class="mb-0 fw-semibold">{{ notice.reason }}</p>
          </div>

          <div class="d-flex flex-wrap justify-content-end gap-2 mt-4">
            <button type="button" class="pl-btn pl-btn--outline" (click)="close()">
              Close
            </button>
            @if (notice.contractId) {
              <a
                class="pl-btn pl-btn--dark"
                [routerLink]="['/contracts', notice.contractId]"
                (click)="close()"
              >
                <tabler-icon icon="scale" [size]="18" />
                View the dispute
              </a>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pl-notice-backdrop {
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

      .pl-notice-modal {
        width: min(520px, 100%);
        background: var(--pl-ivory);
        border: 1px solid var(--pl-stone);
        border-left: 4px solid #a0521e;
        border-radius: var(--pl-radius-lg);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        padding: 1.8rem;
      }

      .pl-notice-reason {
        margin-top: 1rem;
        padding: 0.8rem 1rem;
        border: 1px solid var(--pl-stone);
        border-radius: var(--pl-radius);
        background-color: rgba(160, 82, 30, 0.06);
      }
    `,
  ],
})
export class DisputeNotice {
  protected readonly dialog = inject(DisputeNoticeService);

  protected readonly formatDateTime = formatDateTime;

  protected close(): void {
    this.dialog.close();
  }
}
