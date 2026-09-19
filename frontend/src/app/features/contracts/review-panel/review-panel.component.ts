import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContractStatus } from '../../../core/models/models';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-review-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (alreadyReviewed()) {
      <div class="pl-message">
        You've already left a review for this contract. Thank you!
      </div>
    } @else {
      <form (ngSubmit)="submitReview()" novalidate>
        <div class="pl-field">
          <span class="pl-label-inline">Rating</span>
          <div class="d-flex gap-2">
            @for (value of [1, 2, 3, 4, 5]; track value) {
              <button
                type="button"
                class="pl-rate"
                [class.is-selected]="rating() >= value"
                (click)="rating.set(value)"
                [attr.aria-label]="'Rate ' + value + ' out of 5'"
              >
                {{ rating() >= value ? '★' : '☆' }}
              </button>
            }
          </div>
        </div>
        <div class="pl-field">
          <label class="pl-label-inline" for="pl-review-comment">Comment</label>
          <textarea
            id="pl-review-comment"
            class="pl-textarea"
            required
            maxlength="2000"
            [(ngModel)]="comment"
            name="comment"
            placeholder="How was the collaboration?"
          ></textarea>
        </div>
        @if (error(); as message) {
          <div
            class="pl-message mb-3"
            style="color: var(--pl-burgundy)"
            role="alert"
          >
            {{ message }}
          </div>
        }
        <button type="submit" class="pl-btn pl-btn--accent" [disabled]="submitting()">
          {{ submitting() ? 'Submitting…' : 'Submit review' }}
        </button>
      </form>
    }
  `,
  styles: [
    `
      .pl-rate {
        background: none;
        border: 0;
        font-size: 1.7rem;
        line-height: 1;
        cursor: pointer;
        color: var(--pl-stone-dark);
        padding: 0;
      }

      .pl-rate.is-selected {
        color: var(--pl-brass);
      }
    `,
  ],
})
export class ReviewPanel {
  private readonly reviewService = inject(ReviewService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly contractId = input('');
  readonly contractStatus = input<ContractStatus>('COMPLETED');

  protected readonly alreadyReviewed = signal(false);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      const contractId = this.contractId();
      if (contractId && this.contractStatus() === 'COMPLETED') {
        this.reviewService
          .getContractReviewStatus(contractId)
          .subscribe({
            next: (status) => this.alreadyReviewed.set(status.reviewed),
            error: () => void 0,
          });
      }
    });
  }

  submitReview(): void {
    if (!this.contractId() || this.rating() < 1 || !this.comment().trim()) {
      this.error.set('A rating and a comment are required.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.reviewService
      .createReview({
        contract: this.contractId(),
        rating: this.rating(),
        comment: this.comment().trim(),
      })
      .subscribe({
        next: () => {
          this.toast.success('Review submitted. Thank you.');
          this.alreadyReviewed.set(true);
          this.submitting.set(false);
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to submit the review.'));
          this.submitting.set(false);
        },
      });
  }
}