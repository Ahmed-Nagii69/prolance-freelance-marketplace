import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContractService } from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { Contract, ContractListData, User } from '../../../core/models/models';
import { formatCurrency, deadlineLabel } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-contracts',
  standalone: true,
  imports: [RouterLink, StatusBadge, PaginationControls, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Engagements</p>
        <h1 class="pl-headline mb-0">Contracts</h1>
        <p class="pl-muted mt-2 mb-0">
          Every accepted proposal becomes an active contract. Coordinate,
          complete, and review from here.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (contracts().length === 0) {
          <pl-empty-state
            title="No contracts yet"
            body="Contracts appear here once a proposal is accepted. Browse projects to get started."
          >
            <a routerLink="/projects" class="pl-btn pl-btn--accent pl-btn--sm" pl-empty-action>
              Browse projects
            </a>
          </pl-empty-state>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (contract of contracts(); track contract._id) {
              <a
                [routerLink]="['/contracts', contract._id]"
                class="pl-card pl-card--hover"
                style="text-decoration: none"
              >
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <span class="pl-card__title">{{ contract.project.title }}</span>
                    <p class="pl-card__meta">
                      @if (counterparty(contract); as other) {
                        with {{ other.name }}
                      }
                      · {{ formatCurrency(contract.agreedPrice) }} ·
                      {{ deadlineLabel(contract.deadline) }}
                    </p>
                  </div>
                  <pl-status-badge [status]="contract.status" />
                </div>
                <div class="pl-card__foot mt-3">
                  <span class="pl-faded-link"
                    >Open contract
                    <span aria-hidden="true">→</span></span
                  >
                </div>
              </a>
            }
          </div>

          @if (pagination(); as pagination) {
            <div class="mt-4">
              <pl-pagination [data]="pagination" (pageChange)="goToPage($event)" />
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class Contracts {
  private readonly contractService = inject(ContractService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly contracts = signal<Contract[]>([]);
  protected readonly pagination = signal<NonNullable<ContractListData>['pagination'] | null>(null);
  protected readonly formatCurrency = formatCurrency;
  protected readonly deadlineLabel = deadlineLabel;

  constructor() {
    this.fetch(1);
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.contractService.getContracts(page, 10).subscribe({
      next: (data) => {
        this.contracts.set(data.contracts);
        this.pagination.set(data.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(page: number): void {
    this.fetch(page);
  }

  counterparty(contract: Contract): User | null {
    const me = this.auth.user();
    if (!me) return null;
    const other =
      contract.client._id === me._id ? contract.freelancer : contract.client;
    return other;
  }
}