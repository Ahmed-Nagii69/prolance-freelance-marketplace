import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ContractService,
} from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Contract, User } from '../../../core/models/models';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  initialsOf,
} from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { ReviewPanel } from '../review-panel/review-panel.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-contract-details',
  standalone: true,
  imports: [RouterLink, FormsModule, StatusBadge, EmptyState, LoadingBlock, ReviewPanel],
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

              @if (workPanel(); as work) {
                <div class="pl-panel mb-4">
                  <p class="pl-label mb-2">Work</p>

                  @if (work.mode === 'submit') {
                    <form (ngSubmit)="submitWork()" novalidate>
                      <div class="pl-field">
                        <label class="pl-label-inline" for="cw-desc">
                          Describe the completed work
                        </label>
                        <textarea
                          id="cw-desc"
                          class="pl-textarea"
                          required
                          maxlength="5000"
                          [(ngModel)]="workDescription"
                          name="description"
                          placeholder="Summarize what was delivered — links, deliverables, files, and how to verify it."
                        ></textarea>
                      </div>
                      @if (workError(); as message) {
                        <div
                          class="pl-message mb-3"
                          style="color: var(--pl-burgundy)"
                          role="alert"
                        >
                          {{ message }}
                        </div>
                      }
                      <button
                        type="submit"
                        class="pl-btn pl-btn--accent"
                        [disabled]="workSubmitting()"
                      >
                        {{ workSubmitting() ? 'Submitting…' : 'Submit work' }}
                      </button>
                      <p class="pl-field-hint mt-2">
                        Once submitted, the client reviews your work and either
                        approves it (releasing the payment) or returns it for
                        changes.
                      </p>
                    </form>
                  } @else {
                    @if (submission(); as sub) {
                      <p class="pl-field-hint mb-2">
                        Submitted on
                        {{ sub.submittedAt ? formatDateTime(sub.submittedAt) : '—' }}
                      </p>
                      <div
                        class="pl-panel"
                        style="background: var(--pl-ivory-soft); padding: 1rem"
                      >
                        <p
                          style="white-space: pre-line; line-height: 1.8; color: var(--pl-ink-soft); margin: 0"
                        >
                          {{ sub.description }}
                        </p>
                      </div>
                    }

                    @if (contract()!.workFeedback) {
                      <div class="pl-message mt-3">
                        <strong>Client feedback:</strong>
                        {{ contract()!.workFeedback }}
                      </div>
                    }

                    @if (work.mode === 'review') {
                      <hr class="pl-rule" />
                      <form (ngSubmit)="rejectWork()" novalidate>
                        <div class="pl-field">
                          <label class="pl-label-inline" for="cw-feedback">
                            Feedback / reason to return
                          </label>
                          <textarea
                            id="cw-feedback"
                            class="pl-textarea"
                            maxlength="1000"
                            [(ngModel)]="rejectReason"
                            name="reason"
                            placeholder="Optional — what should the freelancer change?"
                          ></textarea>
                        </div>
                        @if (workError(); as message) {
                          <div
                            class="pl-message mb-3"
                            style="color: var(--pl-burgundy)"
                            role="alert"
                          >
                            {{ message }}
                          </div>
                        }
                        <div class="d-flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="pl-btn pl-btn--accent"
                            [disabled]="workSubmitting()"
                            (click)="approveWork()"
                          >
                            {{ workSubmitting() ? 'Working…' : 'Approve & release payment' }}
                          </button>
                          <button
                            type="submit"
                            class="pl-btn pl-btn--danger"
                            [disabled]="workSubmitting()"
                          >
                            Return for changes
                          </button>
                        </div>
                      </form>
                    } @else if (contract()!.status === 'WORK_SUBMITTED') {
                      <div class="pl-message mt-3">
                        Work has been submitted and is awaiting approval from
                        the client.
                      </div>
                    }
                  }
                </div>
              }

              @if (counterparty(); as other) {
                <div class="pl-panel mb-4">
                  <p class="pl-label mb-2">The other party</p>
                  <div class="d-flex align-items-center gap-3 flex-wrap">
                    <span class="pl-avatar pl-avatar--lg">
                      @if (other.profileImage) {
                        <img [src]="other.profileImage" alt="" />
                      } @else {
                        {{ initialsOf(other.name) }}
                      }
                    </span>
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
                  @if (actions()!.messages) {
                    <a
                      [routerLink]="['/messages/project', contract()!.project._id]"
                      class="pl-btn pl-btn--purple"
                      >Open conversation</a
                    >
                  }
                  @if (user()?.role !== 'ADMIN') {
                    <a
                      [routerLink]="['/messages/project', contract()!.project._id]"
                      class="pl-btn pl-btn--outline pl-btn--sm"
                      >Message</a
                    >
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

              @if (contract()!.status === 'COMPLETED') {
                <div class="pl-panel">
                  <p class="pl-label mb-2">Leave a review</p>
                  <pl-review-panel
                    [contractId]="contract()!._id"
                    [contractStatus]="contract()!.status"
                  />
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
                  <div class="pl-stat" style="border-left-color: var(--pl-burgundy)">
                    @if (contract()!.paymentReleased) {
                      <span class="pl-stat__value" style="font-size: 1.5rem">
                        {{ formatCurrency(contract()!.agreedPrice) }}
                      </span>
                      <span class="pl-stat__label">Payment released</span>
                    } @else if (contract()!.status === 'ACTIVE' || contract()!.status === 'WORK_SUBMITTED') {
                      <span class="pl-stat__value" style="font-size: 1.5rem">
                        {{ formatCurrency(contract()!.heldAmount ?? 0) }}
                      </span>
                      <span class="pl-stat__label">Held in escrow</span>
                    } @else {
                      <span class="pl-stat__value" style="font-size: 1.5rem">—</span>
                      <span class="pl-stat__label">Payment</span>
                    }
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
                  <div class="pl-stat">
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
})
export class ContractDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractService = inject(ContractService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly contract = signal<Contract | null>(null);
  protected readonly user = this.auth.user;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly initialsOf = initialsOf;

  protected readonly workDescription = signal('');
  protected readonly rejectReason = signal('');
  protected readonly workSubmitting = signal(false);
  protected readonly workError = signal('');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.contractService.getContract(id).subscribe({
      next: (contract) => {
        this.contract.set(contract);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/contracts']);
      },
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

  workPanel(): { mode: 'submit' | 'review' | 'info' } | null {
    const contract = this.contract();
    const me = this.user();
    if (!contract || !me || me.role === 'ADMIN') return null;
    const isClient = contract.client._id === me._id;
    const isFreelancer = contract.freelancer._id === me._id;
    if (!isClient && !isFreelancer) return null;

    if (contract.status === 'ACTIVE' && isFreelancer) {
      return { mode: 'submit' };
    }
    if (contract.status === 'WORK_SUBMITTED' && isClient) {
      return { mode: 'review' };
    }
    if (
      contract.status === 'WORK_SUBMITTED' ||
      (contract.status === 'COMPLETED' && contract.workSubmission?.description)
    ) {
      return { mode: 'info' };
    }
    return null;
  }

  submission(): Contract['workSubmission'] | null {
    const sub = this.contract()?.workSubmission;
    return sub?.description ? sub : null;
  }

  actions(): { cancel: boolean; messages: boolean } | null {
    const contract = this.contract();
    if (!contract) return null;
    const me = this.auth.user();
    const participant = Boolean(me && me.role !== 'ADMIN');
    return {
      cancel: participant && contract.status === 'ACTIVE',
      messages: participant && contract.status === 'ACTIVE',
    };
  }

  submitWork(): void {
    const contract = this.contract();
    if (!contract || !this.workDescription().trim()) {
      this.workError.set('Please describe the completed work.');
      return;
    }
    this.workSubmitting.set(true);
    this.workError.set('');
    this.contractService
      .submitWork(contract._id, this.workDescription().trim())
      .subscribe({
        next: () => {
          this.toast.success('Work submitted for approval.');
          this.workSubmitting.set(false);
          this.workDescription.set('');
          this.fetch(contract._id);
        },
        error: (err) => {
          this.workError.set(
            extractApiMessage(err, 'Unable to submit your work.'),
          );
          this.workSubmitting.set(false);
        },
      });
  }

  approveWork(): void {
    const contract = this.contract();
    if (!contract) return;
    this.confirm
      .confirm({
        title: 'Approve the work and release payment?',
        body: 'Approving completes the contract and releases the held amount to the freelancer. This cannot be undone.',
        confirmLabel: 'Approve & release',
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.workSubmitting.set(true);
        this.workError.set('');
        this.contractService.approveWork(contract._id).subscribe({
          next: () => {
            this.toast.success('Work approved and payment released.');
            this.workSubmitting.set(false);
            this.fetch(contract._id);
          },
          error: (err) => {
            this.workError.set(
              extractApiMessage(err, 'Unable to approve the work.'),
            );
            this.workSubmitting.set(false);
          },
        });
      });
  }

  rejectWork(): void {
    const contract = this.contract();
    if (!contract) return;
    this.workSubmitting.set(true);
    this.workError.set('');
    this.contractService
      .rejectWork(contract._id, this.rejectReason().trim())
      .subscribe({
        next: () => {
          this.toast.success('Work returned to the freelancer for changes.');
          this.workSubmitting.set(false);
          this.rejectReason.set('');
          this.fetch(contract._id);
        },
        error: (err) => {
          this.workError.set(
            extractApiMessage(err, 'Unable to return the work.'),
          );
          this.workSubmitting.set(false);
        },
      });
  }

  cancel(): void {
    const contract = this.contract();
    if (!contract) return;
    this.confirm
      .confirm({
        title: 'Cancel this contract?',
        body: 'Both the contract and the project will be cancelled and any held funds are refunded.',
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
}