import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { DisputeService } from '../../../core/services/resource.services';
import { ConfirmService } from '../../../core/services/confirm.service';
import { BanDialogService } from '../../../core/services/ban-dialog.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Dispute,
  DisputeListData,
  DisputeOutcome,
  Role,
} from '../../../core/models/models';
import {
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  roleDisplay,
} from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { extractApiMessage } from '../../../core/utils/http-error';

const STATUS_FILTERS = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

@Component({
  selector: 'pl-admin-disputes',
  standalone: true,
  imports: [
    FormsModule,
    TablerIconComponent,
    StatusBadge,
    PaginationControls,
    LoadingBlock,
    EmptyState,
  ],
  template: `
    @if (loading()) {
      <pl-loading />
    } @else {
      <div class="d-flex flex-wrap gap-2 mb-3">
        @for (option of statusFilters; track option) {
          <button
            type="button"
            class="pl-btn pl-btn--sm"
            [class.pl-btn--accent]="status() === option"
            [class.pl-btn--outline]="status() !== option"
            (click)="setStatus(option)"
          >
            {{ option === 'ALL' ? 'All' : humanizeStatus(option) }}
          </button>
        }
      </div>

      @if (disputes().length === 0) {
        <pl-empty-state
          title="No disputes"
          body="Disputed contracts will appear here for review and settlement."
        />
      } @else {
        <div class="d-flex flex-column gap-3">
          @for (dispute of disputes(); track dispute._id) {
            <div class="pl-panel">
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div style="min-width: 0">
                  <p class="pl-card__title mb-1">
                    {{ projectTitle(dispute) }}
                  </p>
                  <p class="pl-card__meta mb-0">
                    Opened by {{ partyName(dispute.raisedBy) }} on
                    {{ formatDateTime(dispute.createdAt) }}
                  </p>
                </div>
                <pl-status-badge [status]="dispute.status" />
              </div>

              <p class="fw-semibold mt-3 mb-1">{{ dispute.reason }}</p>
              <p
                class="mb-0"
                style="white-space: pre-line; line-height: 1.7; color: var(--pl-ink-soft); overflow-wrap: anywhere"
              >
                {{ dispute.description }}
              </p>

              <div class="d-flex flex-wrap gap-3 mt-3">
                <div class="pl-stat">
                  <span class="pl-stat__value" style="font-size: 1.25rem">
                    {{ formatCurrency(agreedPrice(dispute)) }}
                  </span>
                  <span class="pl-stat__label">Contract amount</span>
                </div>
                <div class="pl-stat" style="border-left-color: var(--pl-burgundy)">
                  <span class="pl-stat__value" style="font-size: 1.25rem">
                    {{ formatCurrency(heldAmount(dispute)) }}
                  </span>
                  <span class="pl-stat__label">Held in escrow</span>
                </div>
                <div class="pl-stat" style="border-left-color: var(--pl-petrol)">
                  <span class="pl-stat__value" style="font-size: 1.25rem">
                    {{ partyName(dispute.raisedBy) }} / {{ partyName(dispute.against) }}
                  </span>
                  <span class="pl-stat__label">Client / Freelancer</span>
                </div>
              </div>

              @if (isActive(dispute)) {
                <div class="d-flex flex-wrap gap-2 mt-4">
                  @if (dispute.status === 'OPEN') {
                    <button
                      type="button"
                      class="pl-btn pl-btn--outline pl-btn--sm"
                      [disabled]="busy() === dispute._id"
                      (click)="startReview(dispute)"
                    >
                      Start review
                    </button>
                  }
                  <button
                    type="button"
                    class="pl-btn pl-btn--accent pl-btn--sm"
                    [disabled]="busy() === dispute._id"
                    (click)="openResolve(dispute)"
                  >
                    <tabler-icon icon="scale" [size]="18" />
                    Resolve dispute
                  </button>
                </div>
              }

              @if (isFinal(dispute)) {
                <div
                  class="pl-panel mt-3"
                  style="background: var(--pl-ivory-soft); padding: 1rem"
                >
                  <p class="pl-label mb-2">Decision</p>
                  <p class="mb-1">
                    <strong>Outcome:</strong>
                    {{ dispute.resolution.outcome ? outcomeLabel(dispute.resolution.outcome) : 'No payment change' }}
                  </p>
                  @if (dispute.resolution.amountToFreelancer > 0) {
                    <p class="mb-1 pl-faint" style="font-size: 0.88rem">
                      {{ formatCurrency(dispute.resolution.amountToFreelancer) }} to the freelancer
                      @if (dispute.resolution.platformFeeAmount > 0) {
                        (fee {{ formatCurrency(dispute.resolution.platformFeeAmount) }})
                      }
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
                      Decided by
                      {{ partyName(dispute.resolution.resolvedBy) }} on
                      {{ formatDateTime(dispute.resolution.resolvedAt) }}
                    </p>
                  }
                </div>
              }

              @if (resolveFor()?._id === dispute._id) {
                <div class="pl-panel mt-4" style="background: var(--pl-ivory-soft)">
                  <p class="pl-label mb-2">Settle the held payment</p>

                  <div class="pl-field">
                    <span class="pl-label-inline">Outcome</span>
                    <div class="d-flex flex-column gap-2">
                      @for (option of outcomes; track option.value) {
                        <label class="pl-radio">
                          <input
                            type="radio"
                            name="outcome-{{ dispute._id }}"
                            [value]="option.value"
                            [ngModel]="outcome()"
                            (ngModelChange)="outcome.set($event)"
                          />
                          <span>
                            <strong>{{ option.label }}</strong>
                            <span class="d-block pl-faint" style="font-size: 0.85rem">
                              {{ option.hint }}
                            </span>
                          </span>
                        </label>
                      }
                    </div>
                  </div>

                  @if (outcome() === 'SPLIT') {
                    <div class="pl-field">
                      <label class="pl-label-inline" for="split-{{ dispute._id }}">
                        Amount for the freelancer
                      </label>
                      <input
                        id="split-{{ dispute._id }}"
                        class="pl-input"
                        type="number"
                        min="0"
                        step="0.01"
                        [ngModel]="splitAmount()"
                        (ngModelChange)="splitAmount.set($event)"
                      />
                      <p class="pl-field-hint mb-0">
                        Between 0 and
                        {{ formatCurrency(heldAmount(dispute)) }} (the held
                        escrow). The rest is refunded to the client.
                      </p>
                    </div>
                  }

                  <div class="pl-field">
                    <label class="pl-label-inline" for="note-{{ dispute._id }}">
                      Decision note
                    </label>
                    <textarea
                      id="note-{{ dispute._id }}"
                      class="pl-textarea"
                      maxlength="2000"
                      [ngModel]="note()"
                      (ngModelChange)="note.set($event)"
                      placeholder="Explain the decision. Both parties see this note."
                    ></textarea>
                  </div>

                  @if (resolveError(); as message) {
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
                      [disabled]="busy() === dispute._id"
                      (click)="resolve(dispute)"
                    >
                      {{ busy() === dispute._id ? 'Settling…' : 'Apply decision' }}
                    </button>
                    <button
                      type="button"
                      class="pl-btn pl-btn--outline"
                      (click)="closeResolve()"
                    >
                      Cancel
                    </button>
                  </div>

                  <!--
                    A suspension is never part of the decision. It is a separate
                    admin action, taken afterwards, and only when the admin asks
                    for it here on purpose.
                  -->
                  <hr class="pl-rule" />
                  <p class="pl-label mb-2">Suspension</p>
                  @if (banCandidates(dispute).length === 0) {
                    <p class="pl-faint mb-0" style="font-size: 0.85rem">
                      Neither party is available to suspend.
                    </p>
                  } @else {
                    <p class="pl-faint" style="font-size: 0.85rem">
                      Settling this dispute does not suspend anyone. If the
                      account should be suspended, choose it below and say for
                      how long.
                    </p>
                    <div class="d-flex flex-wrap gap-2 align-items-end">
                      <div style="min-width: 200px; flex: 1">
                        <label class="pl-label-inline" for="ban-party-{{ dispute._id }}">
                          Account
                        </label>
                        <select
                          id="ban-party-{{ dispute._id }}"
                          class="pl-select w-100"
                          [ngModel]="banPartyId()"
                          (ngModelChange)="banPartyId.set($event)"
                        >
                          @for (candidate of banCandidates(dispute); track candidate.id) {
                            <option [value]="candidate.id">{{ candidate.label }}</option>
                          }
                        </select>
                      </div>
                      <button
                        type="button"
                        class="pl-btn pl-btn--danger"
                        [disabled]="!banPartyId() || busy() === dispute._id"
                        (click)="startBan(dispute)"
                      >
                        Suspend…
                      </button>
                    </div>
                    <p class="pl-field-hint mb-0 mt-2">
                      The account is signed out at once and cannot sign back in
                      until the suspension ends.
                    </p>
                  }
                </div>
              }
            </div>
          }
        </div>

        @if (pagination(); as p) {
          <div class="mt-4">
            <pl-pagination [data]="p" (pageChange)="load($event)" />
          </div>
        }
      }
    }
  `,
})
export class AdminDisputes {
  private readonly disputeService = inject(DisputeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly banDialog = inject(BanDialogService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly outcomes: {
    value: DisputeOutcome;
    label: string;
    hint: string;
  }[] = [
    {
      value: 'RELEASE',
      label: 'Release to the freelancer',
      hint: 'Pays the freelancer what a normal completion would have paid.',
    },
    {
      value: 'REFUND',
      label: 'Refund the client',
      hint: 'Returns the whole held amount to the client and ends the contract.',
    },
    {
      value: 'SPLIT',
      label: 'Split the held amount',
      hint: 'Part goes to the freelancer, the rest is refunded to the client.',
    },
  ];

  protected readonly loading = signal(true);
  protected readonly disputes = signal<Dispute[]>([]);
  protected readonly pagination = signal<NonNullable<DisputeListData>['pagination'] | null>(null);
  protected readonly status = signal('ALL');
  protected readonly busy = signal('');
  protected readonly resolveFor = signal<Dispute | null>(null);
  protected readonly outcome = signal<DisputeOutcome>('RELEASE');
  protected readonly note = signal('');
  protected readonly splitAmount = signal<number | null>(null);
  protected readonly resolveError = signal('');
  protected readonly banPartyId = signal('');

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;
  protected readonly humanizeStatus = humanizeStatus;

  constructor() {
    this.load(1);
  }

  setStatus(status: string): void {
    this.status.set(status);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.disputeService.getDisputes(this.status(), page, 10).subscribe({
      next: (data) => {
        this.disputes.set(data.disputes);
        this.pagination.set(data.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isActive(dispute: Dispute): boolean {
    return dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';
  }

  isFinal(dispute: Dispute): boolean {
    return dispute.status === 'RESOLVED' || dispute.status === 'REJECTED';
  }

  projectTitle(dispute: Dispute): string {
    return typeof dispute.project === 'string'
      ? 'Project'
      : (dispute.project?.title ?? 'Project');
  }

  partyName(value: Dispute['raisedBy'] | Dispute['against'] | Dispute['resolution']['resolvedBy']): string {
    if (typeof value === 'string') {
      return '—';
    }
    return value?.name ?? '—';
  }

  agreedPrice(dispute: Dispute): number {
    return typeof dispute.contract === 'string'
      ? 0
      : (dispute.contract?.agreedPrice ?? 0);
  }

  heldAmount(dispute: Dispute): number {
    return typeof dispute.contract === 'string'
      ? 0
      : (dispute.contract?.heldAmount ?? 0);
  }

  outcomeLabel(outcome: Dispute['resolution']['outcome']): string {
    if (outcome === 'RELEASE') return 'Released to the freelancer';
    if (outcome === 'REFUND') return 'Refunded to the client';
    if (outcome === 'SPLIT') return 'Split between both parties';
    return 'No payment change';
  }

  startReview(dispute: Dispute): void {
    this.busy.set(dispute._id);
    this.disputeService.reviewDispute(dispute._id, '').subscribe({
      next: () => {
        this.toast.success('Dispute moved to review.');
        this.busy.set('');
        this.load(this.pagination()?.page ?? 1);
      },
      error: (err) => {
        this.toast.error(extractApiMessage(err, 'Unable to start the review.'));
        this.busy.set('');
      },
    });
  }

  openResolve(dispute: Dispute): void {
    this.resolveFor.set(dispute);
    this.outcome.set('RELEASE');
    this.note.set('');
    this.splitAmount.set(Math.round(this.agreedPrice(dispute) / 2));
    this.resolveError.set('');
    this.banPartyId.set(this.banCandidates(dispute)[0]?.id ?? '');
  }

  closeResolve(): void {
    this.resolveFor.set(null);
    this.resolveError.set('');
    this.banPartyId.set('');
  }

  /**
   * The accounts an admin may suspend from this dispute. Admins are excluded
   * because the server refuses to ban them, and the signed-in admin is excluded
   * so the choice cannot be aimed at the person making it.
   */
  banCandidates(dispute: Dispute): { id: string; label: string }[] {
    const myId = this.auth.user()?._id;
    const parties = [
      { value: dispute.raisedBy, fallbackRole: 'CLIENT' as Role },
      { value: dispute.against, fallbackRole: 'FREELANCER' as Role },
    ];

    return parties.flatMap((party) => {
      if (typeof party.value === 'string' || party.value === null) {
        return [];
      }
      if (!party.value._id || party.value._id === myId) {
        return [];
      }
      const role = party.value.role ?? party.fallbackRole;
      if (role === 'ADMIN') {
        return [];
      }
      return [
        {
          id: party.value._id,
          label: `${party.value.name} (${roleDisplay(role)})`,
        },
      ];
    });
  }

  /**
   * Asks for a duration and a reason, then applies the ban. It is triggered
   * only by this button, so the decision and the suspension stay two separate
   * acts: settling a dispute can never suspend an account on its own.
   */
  startBan(dispute: Dispute): void {
    const target = this.banCandidates(dispute).find(
      (candidate) => candidate.id === this.banPartyId(),
    );
    if (!target) {
      return;
    }

    this.banDialog
      .open({
        target: { id: target.id, name: target.label },
        context: 'This is a separate action from the decision above.',
      })
      .subscribe((decision) => {
        if (!decision) return;
        this.busy.set(dispute._id);
        this.userService
          .banUser(target.id, decision.durationDays, decision.reason)
          .subscribe({
            next: ({ user }) => {
              this.busy.set('');
              this.toast.success(`${user.name} is suspended.`);
            },
            error: (err) => {
              this.busy.set('');
              this.resolveError.set(
                extractApiMessage(err, 'Unable to suspend this account.'),
              );
            },
          });
      });
  }

  resolve(dispute: Dispute): void {
    const outcome = this.outcome();
    let amountToFreelancer: number | undefined;

    if (outcome === 'SPLIT') {
      amountToFreelancer = Number(this.splitAmount());
      if (
        !Number.isFinite(amountToFreelancer) ||
        amountToFreelancer <= 0 ||
        amountToFreelancer >= this.agreedPrice(dispute) ||
        amountToFreelancer > this.heldAmount(dispute)
      ) {
        this.resolveError.set(
          'Enter an amount for the freelancer between 0 and the held escrow amount.',
        );
        return;
      }
    }

    this.confirm
      .confirm({
        title: 'Apply this decision?',
        body: 'The held payment is settled now and the decision is final. Both parties are notified.',
        confirmLabel: 'Settle payment',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.busy.set(dispute._id);
        this.disputeService
          .resolveDispute(dispute._id, outcome, this.note().trim(), amountToFreelancer)
          .subscribe({
            next: () => {
              this.toast.success('Dispute resolved and the payment settled.');
              this.busy.set('');
              this.closeResolve();
              this.load(this.pagination()?.page ?? 1);
            },
            error: (err) => {
              this.resolveError.set(
                extractApiMessage(err, 'Unable to resolve the dispute.'),
              );
              this.busy.set('');
            },
          });
      });
  }
}
