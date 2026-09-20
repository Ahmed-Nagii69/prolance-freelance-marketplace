import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProposalService } from '../../../core/services/resource.services';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiMessage } from '../../../core/utils/http-error';
import { formatCurrency } from '../../../core/utils/format';

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
              min="1"
              [attr.max]="budget() ?? null"
              [(ngModel)]="price"
              name="price"
            />
            @if (budget() !== null) {
              <p class="pl-field-hint">
                Budget: {{ formatCurrency(budget()!) }}
              </p>
              @if (budgetExceeded()) {
                <p
                  class="pl-field-hint"
                  style="color: var(--pl-burgundy); font-weight: 600"
                >
                  Your bid cannot exceed the project budget
                  ({{ formatCurrency(budget()!) }}).
                </p>
              }
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
            @if (projectDurationDays() !== null) {
              <p class="pl-field-hint">Client duration: {{ projectDurationDays() }} days</p>
              @if (durationExceeded()) {
                <p class="pl-field-hint" style="color: var(--pl-burgundy); font-weight: 600">
                  Your delivery time cannot exceed the client duration.
                </p>
              }
            }
          </div>
        </div>
      </div>

      @if (error(); as message) {
        <div
          class="pl-message mb-3"
          style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
          role="alert"
        >
          {{ message }}
        </div>
      }

      <button
        type="submit"
        class="pl-btn pl-btn--accent w-100"
        [disabled]="submitting()"
      >
        {{ submitting() ? 'Submitting…' : 'Submit proposal' }}
      </button>
    </form>
  `,
})
export class SubmitProposal {
  private readonly proposalService = inject(ProposalService);
  private readonly toast = inject(ToastService);

  readonly projectId = input('');
  readonly budget = input<number | null>(null);
  readonly projectDurationDays = input<number | null>(null);
  readonly submitted = output<void>();

  protected readonly coverLetter = signal('');
  protected readonly price = signal<number | string>('');
  protected readonly deliveryTime = signal<number | string>('');
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly formatCurrency = formatCurrency;

  protected readonly budgetExceeded = computed(() => {
    const budget = this.budget();
    if (budget === null) {
      return false;
    }
    const value = Number(this.price());
    return Number.isFinite(value) && value > 0 && value > budget;
  });

  protected readonly durationExceeded = computed(() => {
    const duration = this.projectDurationDays();
    const value = Number(this.deliveryTime());
    return duration !== null && Number.isFinite(value) && value > duration;
  });

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
    if (this.budgetExceeded()) {
      this.error.set(
        `Your bid cannot exceed the project budget of ${formatCurrency(this.budget()!)}.`,
      );
      return;
    }
    if (this.durationExceeded()) {
      this.error.set(
        `Your delivery time cannot exceed the client duration of ${this.projectDurationDays()} days.`,
      );
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.proposalService
      .createProposal({
        project: this.projectId(),
        coverLetter: this.coverLetter(),
        price: Number(this.price()),
        deliveryTime: Number(this.deliveryTime()),
      })
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