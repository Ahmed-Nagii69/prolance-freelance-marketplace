import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import {
  ContractService,
  DisputeService,
} from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Contract, Dispute, User } from '../../../core/models/models';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  humanizeStatus,
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
  imports: [RouterLink, FormsModule, TablerIconComponent, StatusBadge, EmptyState, LoadingBlock, ReviewPanel],
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
                          style="white-space: pre-line; line-height: 1.8; color: var(--pl-ink-soft); margin: 0; overflow-wrap: anywhere"
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
                    } @else if (contract()!.status === 'DISPUTED') {
                      <div class="pl-message mt-3">
                        This contract is frozen while the dispute is settled, so
                        the work cannot be approved or returned here. A ProLance
                        admin decides the outcome.
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

              @if (disputePanel(); as panel) {
                <div class="pl-panel mb-4">
                  <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <p class="pl-label mb-0">Dispute</p>
                    @if (panel.dispute; as dispute) {
                      <pl-status-badge [status]="dispute.status" />
                    }
                  </div>

                    @if (panel.dispute; as dispute) {
                      <div class="mt-3">
                        <p class="fw-semibold mb-1">{{ dispute.reason }}</p>
                        <p class="pl-faint mb-0" style="font-size: 0.85rem">
                          Opened by {{ partyName(dispute.raisedBy) }} on
                          {{ formatDateTime(dispute.createdAt) }}
                        </p>
                        <p
                          class="mt-2 mb-0"
                          style="white-space: pre-line; line-height: 1.7; color: var(--pl-ink-soft); overflow-wrap: anywhere"
                        >
                          {{ dispute.description }}
                        </p>

                        @if (dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') {
                          <div class="pl-message mt-3">
                            The held payment is frozen
                            {{ dispute.status === 'OPEN' ? 'while the dispute is open' : 'while the dispute is under review' }}.
                            A ProLance admin decides how it is settled.
                          </div>
                        }

                        @if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
                          <div
                            class="pl-panel mt-3"
                            style="background: var(--pl-ivory-soft); padding: 1rem"
                          >
                            <p class="pl-label mb-2">Admin decision</p>
                            <p class="mb-1">
                              <strong>Outcome:</strong>
                              {{ dispute.resolution.outcome ? outcomeLabel(dispute.resolution.outcome) : 'No payment change' }}
                            </p>
                            @if (dispute.resolution.amountToFreelancer > 0) {
                              <p class="mb-1 pl-faint" style="font-size: 0.88rem">
                                {{ formatCurrency(dispute.resolution.amountToFreelancer) }} to the freelancer
                              </p>
                            }
                            @if (dispute.resolution.amountToClient > 0) {
                              <p class="mb-1 pl-faint" style="font-size: 0.88rem">
                                {{ formatCurrency(dispute.resolution.amountToClient) }} refunded to the client
                              </p>
                            }
                            @if (dispute.resolution.note) {
                              <p
                                class="mb-1 mt-2"
                                style="white-space: pre-line; line-height: 1.7; color: var(--pl-ink-soft); overflow-wrap: anywhere"
                              >
                                {{ dispute.resolution.note }}
                              </p>
                            }
                            @if (dispute.resolution.resolvedAt) {
                              <p class="pl-faint mb-0 mt-2" style="font-size: 0.85rem">
                                Decided on {{ formatDateTime(dispute.resolution.resolvedAt) }}
                              </p>
                            }
                          </div>
                        }

                        @if (dispute.statusHistory.length > 0) {
                          <ul class="pl-audit mt-3">
                            @for (entry of dispute.statusHistory; track $index) {
                              <li>
                                <strong>{{ humanizeStatus(entry.status) }}</strong>
                                @if (entry.note) {
                                  — {{ entry.note }}
                                }
                                <span class="pl-faint"> · {{ formatDateTime(entry.at) }}</span>
                              </li>
                            }
                          </ul>
                        }
                      </div>
                    } @else {
                      <p class="pl-muted mt-3 mb-3">
                        If something went wrong on either side, open a dispute. A
                        ProLance admin reviews the contract and decides how the
                        held payment is settled.
                      </p>

                      @if (disputeFormOpen()) {
                        <form (ngSubmit)="submitDispute()" novalidate>
                          <div class="pl-field">
                            <label class="pl-label-inline" for="dispute-reason">
                              Reason
                            </label>
                            <input
                              id="dispute-reason"
                              class="pl-input"
                              maxlength="120"
                              [(ngModel)]="disputeReason"
                              name="reason"
                              placeholder="A short summary, e.g. Work not delivered as agreed"
                            />
                          </div>
                          <div class="pl-field">
                            <label class="pl-label-inline" for="dispute-description">
                              What happened?
                            </label>
                            <textarea
                              id="dispute-description"
                              class="pl-textarea"
                              maxlength="4000"
                              [(ngModel)]="disputeDescription"
                              name="description"
                              placeholder="Describe the problem, what was agreed, and what went wrong."
                            ></textarea>
                          </div>
                          @if (disputeError(); as message) {
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
                              type="submit"
                              class="pl-btn pl-btn--danger"
                              [disabled]="disputeSubmitting()"
                            >
                              {{ disputeSubmitting() ? 'Sending…' : 'Submit dispute' }}
                            </button>
                            <button
                              type="button"
                              class="pl-btn pl-btn--outline"
                              (click)="disputeFormOpen.set(false)"
                            >
                              Keep working
                            </button>
                          </div>
                        </form>
                      } @else {
                        <button
                          type="button"
                          class="pl-btn pl-btn--danger"
                          (click)="disputeFormOpen.set(true)"
                        >
                          <tabler-icon icon="alert-triangle" [size]="18" />
                          Report a dispute
                        </button>
                      }
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
                    } @else if (contract()!.status === 'ACTIVE' || contract()!.status === 'WORK_SUBMITTED' || contract()!.status === 'DISPUTED') {
                      <span class="pl-stat__value" style="font-size: 1.5rem">
                        {{ formatCurrency(contract()!.heldAmount ?? 0) }}
                      </span>
                      <span class="pl-stat__label">
                        {{ disputeActive() ? 'Frozen in dispute' : 'Held in escrow' }}
                      </span>
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
  private readonly disputeService = inject(DisputeService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly contract = signal<Contract | null>(null);
  protected readonly dispute = signal<Dispute | null>(null);
  protected readonly user = this.auth.user;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly humanizeStatus = humanizeStatus;
  protected readonly initialsOf = initialsOf;

  protected readonly workDescription = signal('');
  protected readonly rejectReason = signal('');
  protected readonly workSubmitting = signal(false);
  protected readonly workError = signal('');

  protected readonly disputeFormOpen = signal(false);
  protected readonly disputeReason = signal('');
  protected readonly disputeDescription = signal('');
  protected readonly disputeSubmitting = signal(false);
  protected readonly disputeError = signal('');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.contractService.getContract(id).subscribe({
      next: (contract) => {
        this.contract.set(contract);
        this.loading.set(false);
        this.fetchDispute(id);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/contracts']);
      },
    });
  }

  private fetchDispute(id: string): void {
    this.disputeService.getContractDispute(id).subscribe({
      next: (data) => this.dispute.set(data.dispute),
      error: () => this.dispute.set(null),
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
    // Read-only. A dispute takes away the submit and review panels, but the
    // submission and the feedback stay on the page: they are what both sides and
    // the admin are being asked to look at.
    if (
      contract.status === 'WORK_SUBMITTED' ||
      contract.status === 'DISPUTED' ||
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

  isParticipant(): boolean {
    const me = this.user();
    const contract = this.contract();
    if (!me || !contract || me.role === 'ADMIN') return false;
    return contract.client._id === me._id || contract.freelancer._id === me._id;
  }

  disputeActive(): boolean {
    const status = this.dispute()?.status;
    return status === 'OPEN' || status === 'UNDER_REVIEW';
  }

  disputePanel(): { dispute: Dispute | null } | null {
    const contract = this.contract();
    if (!contract || !this.isParticipant()) return null;

    const dispute = this.dispute();
    if (dispute) {
      return { dispute };
    }

    const canOpen =
      !contract.paymentReleased &&
      (contract.heldAmount ?? 0) > 0 &&
      (contract.status === 'ACTIVE' || contract.status === 'WORK_SUBMITTED');

    return canOpen ? { dispute: null } : null;
  }

  partyName(value: Dispute['raisedBy'] | Dispute['against']): string {
    if (typeof value === 'string') {
      return 'A party';
    }
    return value?.name ?? 'A party';
  }

  outcomeLabel(outcome: Dispute['resolution']['outcome']): string {
    if (outcome === 'RELEASE') return 'Released to the freelancer';
    if (outcome === 'REFUND') return 'Refunded to the client';
    if (outcome === 'SPLIT') return 'Split between both parties';
    return 'No payment change';
  }

  submitDispute(): void {
    const contract = this.contract();
    if (!contract) return;

    const reason = this.disputeReason().trim();
    const description = this.disputeDescription().trim();
    if (!reason || !description) {
      this.disputeError.set('Add a short reason and describe what happened.');
      return;
    }

    this.disputeSubmitting.set(true);
    this.disputeError.set('');
    this.disputeService.openDispute(contract._id, reason, description).subscribe({
      next: () => {
        this.toast.success(
          'Dispute submitted. The contract is frozen until an admin settles it.',
        );
        this.disputeSubmitting.set(false);
        this.disputeFormOpen.set(false);
        this.disputeReason.set('');
        this.disputeDescription.set('');
        this.fetch(contract._id);
      },
      error: (err) => {
        this.disputeError.set(
          extractApiMessage(err, 'Unable to open the dispute.'),
        );
        this.disputeSubmitting.set(false);
      },
    });
  }

  /**
   * A contract is only ever completed by the client approving submitted work, so
   * there is deliberately no "mark as complete" action here. The available
   * actions are the delivery flow itself: submit, approve, reject, cancel.
   *
   * A dispute takes every one of those away, because the admin is the one who
   * settles the money. Messaging deliberately stays open: the two sides are
   * still expected to talk to each other while the case is being reviewed.
   */
  actions(): { cancel: boolean; messages: boolean } | null {
    const contract = this.contract();
    if (!contract) return null;
    const me = this.auth.user();
    const participant = Boolean(me && me.role !== 'ADMIN');
    return {
      cancel: participant && contract.status === 'ACTIVE',
      messages:
        participant &&
        (contract.status === 'ACTIVE' || contract.status === 'DISPUTED'),
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