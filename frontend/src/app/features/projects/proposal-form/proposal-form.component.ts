import { Component, computed, effect, inject, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProposalService } from '../../../core/services/resource.services';
import { PlatformService } from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiMessage } from '../../../core/utils/http-error';
import { formatCurrency } from '../../../core/utils/format';
import { Proposal, ProposalLimits } from '../../../core/models/models';

@Component({
  selector: 'pl-submit-proposal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="submit()" novalidate>
      <div class="pl-field">
        <label class="pl-label-inline" for="prop-cover">Cover letter</label>
        <textarea
          id="prop-cover"
          class="pl-textarea"
          required
          maxlength="5000"
          [(ngModel)]="coverLetter"
          name="coverLetter"
          placeholder="Why are you the right person for this project?"
        ></textarea>
      </div>
      <div class="row g-3">
        <div class="col-12 col-sm-6">
          <div class="pl-field">
            <label class="pl-label-inline" for="prop-price">
              Proposed price (USD)
            </label>
            <input
              id="prop-price"
              type="number"
              class="pl-input"
              required
              step="0.01"
              [attr.min]="minBid() ?? 1"
              [attr.max]="maxBid() ?? null"
              [(ngModel)]="price"
              name="price"
            />
            @if (limits(); as range) {
              <p class="pl-field-hint">
                Your bid must fall inside the client&rsquo;s range:
                {{ formatCurrency(range.min) }} &ndash;
                {{ formatCurrency(range.max) }}
              </p>
              @if (priceTooLow()) {
                <p
                  class="pl-field-hint"
                  style="color: var(--pl-burgundy); font-weight: 600"
                >
                  Your bid must be at least {{ formatCurrency(limits()!.min) }}.
                </p>
              } @else if (priceTooHigh()) {
                <p
                  class="pl-field-hint"
                  style="color: var(--pl-burgundy); font-weight: 600"
                >
                  Your bid cannot exceed
                  {{ formatCurrency(limits()!.max) }}.
                </p>
              }
            } @else if (limitsFailed()) {
              <p class="pl-field-hint" style="color: var(--pl-burgundy); font-weight: 600">
                The accepted bid range could not be loaded. You can still send a
                bid, and the server will confirm the final amount.
              </p>
            }
          </div>
        </div>
        <div class="col-12 col-sm-6">
          <div class="pl-field">
            <label class="pl-label-inline" for="prop-delivery">
              Delivery (days)
            </label>
            <input
              id="prop-delivery"
              type="number"
              class="pl-input"
              required
              min="1"
              [(ngModel)]="deliveryTime"
              name="deliveryTime"
              [attr.max]="projectDurationDays() ?? null"
            />
            @if (durationLimit() !== null) {
              <p class="pl-field-hint">Client duration: {{ durationLimit() }} days</p>
              @if (durationExceeded()) {
                <p class="pl-field-hint" style="color: var(--pl-burgundy); font-weight: 600">
                  Your delivery time cannot exceed the client duration.
                </p>
              }
            }
          </div>
        </div>
      </div>

      @if (platformFeePercent() !== null && price() !== '') {
        <div class="fee-breakdown pl-panel" style="margin-top: 1rem;">
          <h4 class="panel-title" style="margin-bottom: 1rem; font-size: 1rem;">Fee breakdown</h4>
          <div class="fee-row">
            <span>Proposed amount</span>
            <span>{{ formatCurrency(toNumber(price())) }}</span>
          </div>
          <div class="fee-row">
            <span>Platform fee ({{ platformFeePercent() }}%)</span>
            <span>{{ formatCurrency(platformFeeAmount()) }}</span>
          </div>
          <div class="fee-row fee-net">
            <span>You receive</span>
            <span>{{ formatCurrency(freelancerNetAmount()) }}</span>
          </div>
        </div>
      }

      @if (error(); as message) {
        <div
          class="pl-message mb-3"
          style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
          role="alert"
        >
          {{ message }}
        </div>
      }

      @if (isEdit()) {
        <p class="pl-field-hint mb-3">
          This is your one edit. Once you save, the proposal is locked and the
          client sees the revision.
        </p>
      }

      <button
        type="submit"
        class="pl-btn pl-btn--accent w-100"
        [disabled]="submitting()"
      >
        {{
          submitting()
            ? isEdit()
              ? 'Saving…'
              : 'Submitting…'
            : isEdit()
              ? 'Save changes'
              : 'Submit proposal'
        }}
      </button>
    </form>
  `,
  styles: [`
    .fee-breakdown {
      background-color: var(--pl-ivory-soft);
      border-color: var(--pl-line);
    }
    .fee-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--pl-line);
      font-size: 0.9rem;
    }
    .fee-row:last-child {
      border-bottom: none;
    }
    .fee-row.fee-net {
      font-weight: 700;
      font-size: 1rem;
      color: var(--pl-petrol);
    }
  `],
})
export class SubmitProposal implements OnInit {
  private readonly proposalService = inject(ProposalService);
  private readonly platformService = inject(PlatformService);
  private readonly toast = inject(ToastService);

  readonly projectId = input('');
  // Only used as the placeholder shown for the moment before the server's range
  // arrives. The accepted range itself is never derived from the client side.
  readonly projectDurationDays = input<number | null>(null);
  // Passing an existing proposal switches the form from submit to the single
  // allowed edit, prefilled with the values that were submitted.
  readonly proposal = input<Proposal | null>(null);
  readonly submitted = output<void>();
  readonly saved = output<Proposal>();
  readonly cancelled = output<void>();

  protected readonly coverLetter = signal('');
  protected readonly price = signal<number | string>('');
  protected readonly deliveryTime = signal<number | string>('');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly platformFeePercent = signal<number | null>(null);
  // The range the API will accept for this project, resolved server side.
  protected readonly limits = signal<ProposalLimits | null>(null);
  protected readonly limitsFailed = signal(false);

  protected readonly isEdit = computed(() => this.proposal() !== null);

  private readonly prefilledFor = signal<string | null>(null);

  protected readonly formatCurrency = formatCurrency;

  protected readonly minBid = computed(() => this.limits()?.min ?? null);
  protected readonly maxBid = computed(() => this.limits()?.max ?? null);
  // The server's copy wins; the project input is only a placeholder for the
  // moment before the limits arrive.
  protected readonly durationLimit = computed(
    () => this.limits()?.durationDays ?? this.projectDurationDays(),
  );

  protected readonly priceTooLow = computed(() => {
    const min = this.minBid();
    const value = Number(this.price());
    return min !== null && Number.isFinite(value) && value > 0 && value < min;
  });

  protected readonly priceTooHigh = computed(() => {
    const max = this.maxBid();
    const value = Number(this.price());
    return max !== null && Number.isFinite(value) && value > max;
  });

  protected readonly platformFeeAmount = computed(() => {
    const p = Number(this.price());
    const percent = this.platformFeePercent();
    if (!Number.isFinite(p) || p <= 0 || percent === null) return 0;
    return Math.round(p * (percent / 100) * 100) / 100;
  });

  protected readonly freelancerNetAmount = computed(() => {
    const p = Number(this.price());
    const fee = this.platformFeeAmount();
    if (!Number.isFinite(p) || p <= 0) return 0;
    return Math.round((p - fee) * 100) / 100;
  });

  protected readonly toNumber = (value: number | string): number => Number(value);

  protected readonly durationExceeded = computed(() => {
    const duration = this.durationLimit();
    const value = Number(this.deliveryTime());
    return duration !== null && Number.isFinite(value) && value > duration;
  });

  constructor() {
    // Prefill once per proposal, not on every change of the input, so a parent
    // re-render cannot wipe what the freelancer is currently typing.
    effect(() => {
      const proposal = this.proposal();
      if (!proposal) {
        return;
      }
      if (this.prefilledFor() === proposal._id) {
        return;
      }
      this.prefilledFor.set(proposal._id);
      this.coverLetter.set(proposal.coverLetter);
      this.price.set(proposal.price);
      this.deliveryTime.set(proposal.deliveryTime);
      this.error.set('');
    });

    // The accepted range belongs to the project, so it is re-read whenever the
    // form is pointed at a different one.
    effect(() => {
      const projectId = this.projectId();
      if (!projectId) {
        this.limits.set(null);
        this.limitsFailed.set(false);
        return;
      }
      this.proposalService.getProposalLimits(projectId).subscribe({
        next: (limits) => {
          this.limits.set(limits);
          this.limitsFailed.set(false);
        },
        error: () => {
          this.limits.set(null);
          this.limitsFailed.set(true);
        },
      });
    });
  }

  ngOnInit(): void {
    this.platformService.getSettings().subscribe({
      next: (res) => this.platformFeePercent.set(res.platformFeePercent),
      error: () => this.platformFeePercent.set(10),
    });
  }

  submit(): void {
    if (
      !this.projectId() ||
      !this.coverLetter().trim() ||
      !this.price() ||
      !this.deliveryTime()
    ) {
      this.error.set('Cover letter, price and delivery time are required.');
      return;
    }
    // Mirrors the server's own bound check so the form fails fast, but the
    // numbers themselves always come from the server: nothing is re-derived here.
    if (this.priceTooLow() || this.priceTooHigh()) {
      const range = this.limits();
      this.error.set(
        range && this.priceTooLow()
          ? `Your bid must be at least ${formatCurrency(range.min)}.`
          : `Your bid cannot exceed ${formatCurrency(range?.max ?? 0)}.`,
      );
      return;
    }
    if (this.durationExceeded()) {
      this.error.set(
        `Your delivery time cannot exceed the client duration of ${this.durationLimit()} days.`,
      );
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const payload = {
      coverLetter: this.coverLetter(),
      price: Number(this.price()),
      deliveryTime: Number(this.deliveryTime()),
    };
    const existing = this.proposal();

    if (existing) {
      this.proposalService.updateProposal(existing._id, payload).subscribe({
        next: (updated) => {
          this.toast.success('Your proposal has been updated.');
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to update proposal.'));
          this.submitting.set(false);
        },
      });
      return;
    }

    this.proposalService
      .createProposal({ project: this.projectId(), ...payload })
      .subscribe({
        next: () => {
          this.toast.success('Your proposal has been submitted.');
          this.submitting.set(false);
          this.submitted.emit();
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to submit proposal.'));
          this.submitting.set(false);
        },
      });
  }
}