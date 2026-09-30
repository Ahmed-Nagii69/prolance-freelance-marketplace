import { Component, computed, inject } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService } from '../../../core/services/auth.service';
import { BanInfo } from '../../../core/models/models';
import {
  banWindowLabel,
  formatDateTime,
} from '../../../core/utils/format';

/**
 * Shown whenever the API reports that the account is suspended, whether the
 * member was on the login form or was already signed in when the ban landed.
 *
 * The dialog is not dismissible by clicking away or pressing Escape: the member
 * has to acknowledge it before returning to the login form, so a suspension can
 * never look like an unexplained sign-out.
 */
@Component({
  selector: 'pl-account-suspended',
  standalone: true,
  imports: [TablerIconComponent],
  template: `
    @if (ban(); as info) {
      <div class="pl-suspend" role="dialog" aria-modal="true" aria-labelledby="pl-suspend-title">
        <div class="pl-suspend__card">
          <p class="pl-suspend__mark" aria-hidden="true">
            <tabler-icon icon="alert-triangle" [size]="24" />
          </p>

          <h2 class="pl-h3" id="pl-suspend-title">Account temporarily suspended</h2>

          <p class="pl-muted mb-0">
            @if (info.isPermanent) {
              Your access to ProLance has been suspended. Contact support if you
              think this is a mistake.
            } @else {
              Your access to ProLance is suspended
              @if (remaining(); as window) {
                {{ window }}
              }
              . You will be able to sign in again
              {{ expiryLabel() }}.
            }
          </p>

          @if (info.reason) {
            <div class="pl-suspend__reason">
              <span class="pl-label">Reason</span>
              <p class="mb-0">{{ info.reason }}</p>
            </div>
          }

          <p class="pl-suspend__meta">
            @if (bannedAtLabel(); as applied) {
              Suspended {{ applied }}.
            }
            @if (!info.isPermanent && expiryLabel(); as until) {
              Ends {{ until }}.
            }
          </p>

          <button type="button" class="pl-btn pl-btn--dark w-100" (click)="acknowledge()">
            Back to sign in
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .pl-suspend {
        position: fixed;
        inset: 0;
        z-index: 1200;
        background: rgba(23, 21, 18, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem 1rem;
      }

      .pl-suspend__card {
        width: min(440px, 100%);
        background: var(--pl-ivory);
        border: 1px solid var(--pl-stone);
        border-radius: var(--pl-radius-lg);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        padding: 2rem;
        text-align: center;
      }

      .pl-suspend__mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin-bottom: 1.1rem;
        border-radius: 50%;
        background: rgba(105, 68, 81, 0.1);
        color: var(--pl-burgundy);
      }

      .pl-suspend__reason {
        margin-top: 1.35rem;
        padding: 0.9rem 1rem;
        text-align: left;
        background: var(--pl-paper);
        border: 1px solid var(--pl-line);
        border-left: 3px solid var(--pl-burgundy);
        border-radius: var(--pl-radius);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      .pl-suspend__reason .pl-label {
        display: block;
        margin-bottom: 0.35rem;
      }

      .pl-suspend__meta {
        margin: 1.1rem 0 1.5rem;
        font-size: 0.82rem;
        color: var(--pl-ink-faint);
      }
    `,
  ],
})
export class AccountSuspended {
  private readonly auth = inject(AuthService);

  protected readonly ban = computed<BanInfo | null>(() => this.auth.ban());
  protected readonly remaining = computed(() =>
    banWindowLabel(this.ban()?.bannedUntil ?? null),
  );
  protected readonly expiryLabel = computed(() => {
    const info = this.ban();
    return info && !info.isPermanent ? formatDateTime(info.bannedUntil) : null;
  });
  protected readonly bannedAtLabel = computed(() => {
    const bannedAt = this.ban()?.bannedAt;
    return bannedAt ? `on ${formatDateTime(bannedAt)}` : null;
  });

  acknowledge(): void {
    this.auth.dismissBan();
  }
}
