import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AnalyticsActivityEntry, AnalyticsActivityType } from '../../../core/models/models';
import { formatCurrency, formatDate } from '../../../core/utils/format';

const ICONS: Record<AnalyticsActivityType, string> = {
  PROJECT_CREATED: 'folder-plus',
  PROPOSAL_SUBMITTED: 'send',
  PROPOSAL_RECEIVED: 'mailbox',
  PROPOSAL_ACCEPTED: 'circle-check',
  PROPOSAL_REJECTED: 'circle-x',
  CONTRACT_STARTED: 'file-certificate',
  CONTRACT_COMPLETED: 'file-check',
  PAYMENT_RECEIVED: 'coin',
  PAYMENT_MADE: 'credit-card',
  REVIEW_RECEIVED: 'star',
  REVIEW_SUBMITTED: 'star-filled',
};

@Component({
  selector: 'pl-activity-feed',
  standalone: true,
  imports: [RouterLink, TablerIconComponent],
  template: `
    @if (entries().length === 0) {
      <div class="pl-empty">
        <p class="pl-empty__title">Nothing yet</p>
        <p class="pl-empty__body">{{ emptyBody() }}</p>
      </div>
    } @else {
      <ul class="feed list-unstyled mb-0">
        @for (entry of entries(); track entry.at + entry.title) {
          <li class="feed__row">
            <span class="feed__icon">
              <tabler-icon [icon]="iconFor(entry.type)" [size]="18" />
            </span>
            <div class="feed__body">
              <a class="feed__title" [routerLink]="entry.link">{{ entry.title }}</a>
              <span class="feed__meta">{{ formatDate(entry.at) }}</span>
            </div>
            @if (entry.amount !== null) {
              <span class="feed__amount">{{ formatCurrency(entry.amount) }}</span>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .feed__row {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.75rem 0.4rem;
        border-bottom: 1px solid var(--pl-line);
        border-radius: var(--pl-radius);
        transition: background-color 120ms ease;
      }

      .feed__row:last-child {
        border-bottom: none;
      }

      .feed__row:hover {
        background-color: var(--pl-ivory-soft);
      }

      .feed__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        border-radius: 50%;
        background-color: rgba(36, 92, 90, 0.1);
        color: var(--pl-petrol);
      }

      .feed__body {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 0.1rem;
      }

      .feed__title {
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--pl-ink);
        line-height: 1.4;
      }

      .feed__title:hover {
        color: var(--pl-petrol);
      }

      .feed__meta {
        font-size: 0.78rem;
        color: var(--pl-ink-faint);
      }

      .feed__amount {
        margin-left: auto;
        font-family: var(--pl-font-display);
        font-size: 1.05rem;
        white-space: nowrap;
        color: var(--pl-ink);
      }

      @media (prefers-reduced-motion: reduce) {
        .feed__row {
          transition: none;
        }
      }
    `,
  ],
})
export class ActivityFeed {
  readonly entries = input<AnalyticsActivityEntry[]>([]);
  readonly emptyBody = input<string>(
    'Your latest proposals, contracts, payments and reviews will show up here.',
  );

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;

  protected iconFor(type: AnalyticsActivityType): string {
    return ICONS[type] ?? 'activity';
  }
}
