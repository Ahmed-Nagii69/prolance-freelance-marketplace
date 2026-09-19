import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ContractService,
  ReviewService,
} from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Contract,
  User,
} from '../../../core/models/models';
import {
  formatCurrency,
  formatDate,
  initialsOf,
} from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-contract-details',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadge, EmptyState, LoadingBlock,],
  template: `
    @if (loading()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-loading />
      </div>
    } @else if (!contract()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-empty-state
          title="Contract not found"
          body="This contract no longer exists or you don't have access to it."
        >
          <a routerLink="/contracts" class="pl-btn pl-btn--outline pl-btn--sm" pl-empty-action>
            Back to contracts
          </a>
        </pl-empty-state>
      </div>
    } @else {
      <div class="pl-page-title">
        <div class="pl-container">
          <a routerLink="/contracts" class="pl-faded-link">← All contracts</a>
          <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mt-3">
            <div>
              <p class="pl-kicker">Contract</p>
              <h1 class="pl-headline mb-0">{{ contract()!.project.title }}</h1>
            </div>
            <pl-status-badge [status]="contract()!.status" />
          </div>
        </div>
      </div>

      <section class="pl-section pl-section--tight">
        <div class="pl-container">
          <div class="row g-4">
            <div class="col-12 col-lg-8">
              <div class="pl-panel mb-4">
                <p class="pl-label mb-1">Agreed scope</p>
                <p style="line-height: 1.8; color: var(--pl-ink-soft)">
                  {{ contract()!.proposal.coverLetter }}
                </p>
              </div>

              @if (counterparty(); as other) {
                <div class="pl-panel mb-4">
                  <p class="pl-label mb-2">The other party</p>
                  <div class="d-flex align-items-center gap-3 flex-wrap">
                    <span class="pl-avatar pl-avatar--lg">{{ initialsOf(other.name) }}</span>
                    <div>
                      <p class="mb-0 fw-semibold">{{ other.name }}</p>
                      <p class="pl-faint mb-0" style="font-size: 0.9rem">{{ other.email }}</p>
                    </div>
                    <a
                      [routerLink]="['/users', other._id]"
                      class="pl-faded-link ms-auto"
                      >View profile →</a
                    >
                  </div>
                </div>
              }

              @if (actions()) {
                <div class="d-flex flex-wrap gap-2 mb-4">
                  <a
                    [routerLink]="['/messages/project', contract()!.project._id]"
                    class="pl-btn pl-btn--purple"
                    >Open conversation</a
                  >
                  @if (actions()!.complete) {
                    <button
                      type="button"
                      class="pl-btn pl-btn--accent"
                      (click)="complete()"
                    >
                      Mark contract completed
                    </button>
                  }
                  @if (actions()!.cancel) {
                    <button
                      type="button"
                      class="pl-btn pl-btn--danger"
                      (click)="cancel()"
                    >
                      Cancel contract
                    </button>
                  }
                </div>
              }

              @if (canReview()) {
                <div class="pl-panel">
                  <p class="pl-label mb-2">Leave a review</p>
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
                              [class.is-selected]="reviewRating() >= value"
                              (click)="reviewRating.set(value)"
                              [attr.aria-label]="'Rate ' + value + ' out of 5'"
                            >
                              {{ reviewRating() >= value ? '★' : '☆' }}
                            </button>
                          }
                        </div>
                      </div>
                      <div class="pl-field">
                        <label class="pl-label-inline" for="cv-comment">Comment</label>
                        <textarea
                          id="cv-comment"
                          class="pl-textarea"
                          required
                          maxlength="2000"
                          [(ngModel)]="reviewComment"
                          name="comment"
                          placeholder="How was the collaboration?"
                        ></textarea>
                      </div>
                      @if (reviewError(); as message) {
                        <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                          {{ message }}
                        </div>
                      }
                      <button
                        type="submit"
                        class="pl-btn pl-btn--accent"
                        [disabled]="reviewSubmitting()"
                      >
                        {{ reviewSubmitting() ? 'Submitting…' : 'Submit review' }}
                      </button>
                    </form>
                  }
                </div>
              }
            </div>

            <div class="col-12 col-lg-4">
              <div class="pl-panel" style="position: sticky; top: 90px">
                <p class="pl-label">Terms</p>
                <div class="d-flex flex-column gap-3 mt-1">
                  <div class="pl-stat">
                    <span class="pl-stat__value">{{ formatCurrency(contract()!.agreedPrice) }}</span>
                    <span class="pl-stat__label">Agreed price</span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-purple)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ formatDate(contract()!.deadline) }}
                    </span>
                    <span class="pl-stat__label">Deadline</span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-brass)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ formatDate(contract()!.startDate) }}
                    </span>
                    <span class="pl-stat__label">Started</span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-burgundy)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ contract()!.proposal.deliveryTime }} days
                    </span>
                    <span class="pl-stat__label">Agreed delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
export class ContractDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);
  private readonly reviewService = inject(ReviewService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly contract = signal<Contract | null>(null);
  protected readonly user = this.auth.user;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly initialsOf = initialsOf;

  protected readonly canReview = signal(false);
  protected readonly alreadyReviewed = signal(false);
  protected readonly reviewRating = signal(0);
  protected readonly reviewComment = signal('');
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal('');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.contractService.getContract(id).subscribe({
      next: (contract) => {
        this.contract.set(contract);
        this.loading.set(false);
        this.evaluateReviewAbility(contract);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/contracts']);
      },
    });
  }

  private evaluateReviewAbility(contract: Contract): void {
    const me = this.auth.user();
    if (!me || contract.status !== 'COMPLETED') return;

    const other =
      contract.client._id === me._id ? contract.freelancer : contract.client;

    this.canReview.set(true);

    this.reviewService.getUserReviews(other._id, 1, 100).subscribe({
      next: (data) => {
        const mine = data.reviews.find(
          (review) =>
            typeof review.reviewer === 'object' &&
            review.reviewer._id === me._id &&
            review.contract === contract._id,
        );
        this.alreadyReviewed.set(Boolean(mine));
      },
      error: () => void 0,
    });
  }

  counterparty(): User | null {
    const me = this.user();
    const contract = this.contract();
    if (!me || !contract) return null;
    return contract.client._id === me._id
      ? contract.freelancer
      : contract.client;
  }

  actions(): { complete: boolean; cancel: boolean; messages: boolean } | null {
    const contract = this.contract();
    if (!contract) return null;
    return {
      complete: contract.status === 'ACTIVE',
      cancel: contract.status === 'ACTIVE',
      messages: contract.status === 'ACTIVE',
    };
  }

  complete(): void {
    const contract = this.contract();
    if (!contract) return;
    this.confirm
      .confirm({
        title: 'Complete this contract?',
        body: 'The project will be marked completed and both parties can leave verified reviews.',
        confirmLabel: 'Complete contract',
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.contractService.completeContract(contract._id).subscribe({
          next: () => {
            this.toast.success('Contract marked as completed.');
            this.fetch(contract._id);
          },
          error: (err) =>
            this.toast.error(
              extractApiMessage(err, 'Unable to complete the contract.'),
            ),
        });
      });
  }

  cancel(): void {
    const contract = this.contract();
    if (!contract) return;
    this.confirm
      .confirm({
        title: 'Cancel this contract?',
        body: 'Both the contract and the project will be cancelled. This cannot be undone.',
        confirmLabel: 'Cancel contract',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.contractService.cancelContract(contract._id).subscribe({
          next: () => {
            this.toast.success('Contract cancelled.');
            this.fetch(contract._id);
          },
          error: (err) =>
            this.toast.error(
              extractApiMessage(err, 'Unable to cancel the contract.'),
            ),
        });
      });
  }

  submitReview(): void {
    const contract = this.contract();
    if (!contract || this.reviewRating() < 1 || !this.reviewComment().trim()) {
      this.reviewError.set('A rating and a comment are required.');
      return;
    }
    this.reviewSubmitting.set(true);
    this.reviewError.set('');
    this.reviewService
      .createReview({
        contract: contract._id,
        rating: this.reviewRating(),
        comment: this.reviewComment(),
      })
      .subscribe({
        next: () => {
          this.toast.success('Review submitted. Thank you.');
          this.alreadyReviewed.set(true);
          this.reviewSubmitting.set(false);
        },
        error: (err) => {
          this.reviewError.set(
            extractApiMessage(err, 'Unable to submit the review.'),
          );
          this.reviewSubmitting.set(false);
        },
      });
  }
}