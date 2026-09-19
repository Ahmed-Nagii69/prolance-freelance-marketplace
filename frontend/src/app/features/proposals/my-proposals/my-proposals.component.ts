import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProposalService } from '../../../core/services/resource.services';
import { Proposal, ProposalListData } from '../../../core/models/models';
import { formatCurrency } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-my-proposals',
  standalone: true,
  imports: [RouterLink, StatusBadge, PaginationControls, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Freelancer workspace</p>
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
          <h1 class="pl-headline mb-0">My proposals</h1>
          <a routerLink="/projects" class="pl-btn pl-btn--dark">Find projects</a>
        </div>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (proposals().length === 0) {
          <pl-empty-state
            title="No proposals yet"
            body="Browse open projects and submit a proposal with your price, timeline and cover letter."
          >
            <a routerLink="/projects" class="pl-btn pl-btn--accent pl-btn--sm" pl-empty-action>
              Browse projects
            </a>
          </pl-empty-state>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (proposal of proposals(); track proposal._id) {
              <div class="pl-card">
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <a
                      [routerLink]="['/projects', projectId(proposal)]"
                      class="pl-card__title"
                      style="display: inline-block"
                      >{{ projectTitle(proposal) }}</a
                    >
                    <p class="pl-card__meta">
                      Proposing {{ formatCurrency(proposal.price) }} ·
                      {{ proposal.deliveryTime }} days
                    </p>
                  </div>
                  <pl-status-badge [status]="proposal.status" />
                </div>
                <p class="pl-card__body mb-0" style="margin-bottom: 0">
                  {{ proposal.coverLetter }}
                </p>
                <div class="pl-card__foot mt-3">
                  <a
                    [routerLink]="['/projects', projectId(proposal)]"
                    class="pl-faded-link"
                    >View project →</a
                  >
                  @if (proposal.status === 'ACCEPTED') {
                    <a
                      [routerLink]="['/contracts']"
                      class="pl-btn pl-btn--outline pl-btn--sm ms-auto"
                      >View contracts</a
                    >
                  }
                </div>
              </div>
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
export class MyProposals {
  private readonly proposalService = inject(ProposalService);

  protected readonly loading = signal(true);
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly pagination = signal<NonNullable<ProposalListData>['pagination'] | null>(null);
  protected readonly formatCurrency = formatCurrency;

  constructor() {
    this.fetch(1);
  }

  fetch(page: number): void {
    this.loading.set(true);
    this.proposalService.getMyProposals(page, 10).subscribe({
      next: (data) => {
        this.proposals.set(data.proposals);
        this.pagination.set(data.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(page: number): void {
    this.fetch(page);
  }

  projectId(proposal: Proposal): string {
    return typeof proposal.project === 'object' ? proposal.project._id : proposal.project;
  }

  projectTitle(proposal: Proposal): string {
    if (typeof proposal.project === 'object' && proposal.project.title) {
      return proposal.project.title;
    }
    return 'Project';
  }
}