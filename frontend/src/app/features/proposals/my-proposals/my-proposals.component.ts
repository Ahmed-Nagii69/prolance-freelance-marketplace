import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProposalService } from '../../../core/services/resource.services';
import { Proposal, ProjectStatus, ProposalListData } from '../../../core/models/models';
import { formatCurrency, formatDate } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { SubmitProposal } from '../../projects/proposal-form/proposal-form.component';

@Component({
  selector: 'pl-my-proposals',
  standalone: true,
  imports: [RouterLink, StatusBadge, PaginationControls, LoadingBlock, EmptyState, SubmitProposal],
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
                      {{ proposal.deliveryTime }} days ·
                      submitted {{ formatDate(proposal.createdAt) }}
                    </p>
                  </div>
                  <pl-status-badge [status]="proposal.status" />
                </div>
                <p class="pl-card__body mb-0" style="margin-bottom: 0">
                  {{ proposal.coverLetter }}
                </p>

                @if (isEdited(proposal)) {
                  <p class="pl-field-hint mb-0" style="margin-top: 0.75rem">
                    Edited once on {{ formatDate(proposal.updatedAt) }} — this
                    proposal can no longer be changed.
                  </p>
                }

                @if (editingId() === proposal._id) {
                  <div class="pl-panel mt-3">
                    <p class="pl-kicker mb-1">Edit proposal</p>
                    <h2
                      class="pl-headline mb-3"
                      style="font-size: 1.4rem"
                    >
                      {{ projectTitle(proposal) }}
                    </h2>
                    <pl-submit-proposal
                      [proposal]="proposal"
                      [projectId]="projectId(proposal)"
                      [projectDurationDays]="projectDurationDays(proposal)"
                      (saved)="onSaved($event)"
                      (cancelled)="cancelEdit()"
                    />
                    <button
                      type="button"
                      class="pl-btn pl-btn--outline w-100 mt-2"
                      (click)="cancelEdit()"
                    >
                      Cancel
                    </button>
                  </div>
                }

                <div class="pl-card__foot mt-3">
                  <a
                    [routerLink]="['/projects', projectId(proposal)]"
                    class="pl-faded-link"
                    >View project →</a
                  >
                  @if (canEdit(proposal)) {
                    <button
                      type="button"
                      class="pl-btn pl-btn--outline pl-btn--sm ms-auto me-2"
                      (click)="startEdit(proposal)"
                    >
                      Edit proposal
                    </button>
                  }
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
  protected readonly editingId = signal<string | null>(null);
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;

  constructor() {
    this.fetch(1);
  }

  fetch(page: number): void {
    this.loading.set(true);
    this.proposalService.getMyProposals(page, 10).subscribe({
      next: (data) => {
        this.proposals.set(data.proposals);
        this.pagination.set(data.pagination);
        this.editingId.set(null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(page: number): void {
    this.fetch(page);
  }

  // A bid can be revised exactly once, and only while it is still pending on a
  // project that is still open. The server repeats all three checks.
  canEdit(proposal: Proposal): boolean {
    return (
      proposal.status === 'PENDING' &&
      !this.isEdited(proposal) &&
      this.projectStatus(proposal) === 'OPEN'
    );
  }

  isEdited(proposal: Proposal): boolean {
    return (proposal.editCount ?? 0) >= 1;
  }

  startEdit(proposal: Proposal): void {
    this.editingId.set(proposal._id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  // The response carries the incremented editCount, so replacing the row in
  // place retires the edit control without a refetch.
  onSaved(updated: Proposal): void {
    this.editingId.set(null);
    this.proposals.update((items) =>
      items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
    );
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

  projectDurationDays(proposal: Proposal): number | null {
    return typeof proposal.project === 'object'
      ? (proposal.project.durationDays ?? null)
      : null;
  }

  private projectStatus(proposal: Proposal): ProjectStatus | undefined {
    return typeof proposal.project === 'object' ? proposal.project.status : undefined;
  }
}