import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProposalService } from '../../../core/services/resource.services';
import { ProjectService } from '../../../core/services/project.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Project, Proposal, User } from '../../../core/models/models';
import { formatCurrency, initialsOf } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-project-proposals',
  standalone: true,
  imports: [RouterLink, StatusBadge, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <a routerLink="/projects" class="pl-faded-link">← Back</a>
        <p class="pl-kicker" style="margin-top: 1.4rem">Proposals</p>
        <h1 class="pl-headline mb-0">{{ project()?.title }}</h1>
        <p class="pl-muted mt-2 mb-0">
          Review applicants and accept the proposal you want to work with.
          Accepting creates a contract and closes the project.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (proposals().length === 0) {
          <pl-empty-state
            title="No proposals yet"
            body="When freelancers apply, their proposals will appear here with their price, timeline and cover letter."
          />
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (proposal of proposals(); track proposal._id) {
              <div class="pl-panel">
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div class="d-flex align-items-start gap-3">
                    <span class="pl-avatar pl-avatar--lg">
                      {{ initialsOf(freelancerName(proposal)) }}
                    </span>
                    <div>
                      <p class="mb-0 fw-semibold">{{ freelancerName(proposal) }}</p>
                      <p class="pl-faint mb-0" style="font-size: 0.9rem">
                        {{ proposal.deliveryTime }} day delivery
                      </p>
                    </div>
                  </div>
                  <div class="d-flex align-items-center justify-content-between justify-content-md-end gap-3">
                    <span class="pl-h3 m-0" style="color: var(--pl-petrol)">
                      {{ formatCurrency(proposal.price) }}
                    </span>
                    <pl-status-badge [status]="proposal.status" />
                  </div>
                </div>

                <p class="mt-3 mb-2" style="color: var(--pl-ink-soft); line-height: 1.7">
                  {{ proposal.coverLetter }}
                </p>

                @if (proposal.status === 'PENDING') {
                  <div class="d-flex gap-2 mt-2">
                    <button
                      type="button"
                      class="pl-btn pl-btn--accent pl-btn--sm"
                      (click)="accept(proposal)"
                    >
                      Accept & start contract
                    </button>
                    <button
                      type="button"
                      class="pl-btn pl-btn--danger pl-btn--sm"
                      (click)="reject(proposal)"
                    >
                      Reject
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ProjectProposals {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proposalService = inject(ProposalService);
  private readonly projectService = inject(ProjectService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly project = signal<Project | null>(null);
  protected readonly proposals = signal<Proposal[]>([]);
  protected readonly formatCurrency = formatCurrency;
  protected readonly initialsOf = initialsOf;

  constructor() {
    const projectId = this.route.snapshot.paramMap.get('id') ?? '';

    this.projectService.getProject(projectId).subscribe({
      next: (project) => this.project.set(project),
      error: () => void 0,
    });

    this.proposalService.getProjectProposals(projectId, 1, 100).subscribe({
      next: (data) => {
        this.proposals.set(data.proposals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  freelancerName(proposal: Proposal): string {
    const freelancer = proposal.freelancer;
    if (typeof freelancer === 'object' && freelancer !== null) {
      return (freelancer as User).name;
    }
    return 'Freelancer';
  }

  accept(proposal: Proposal): void {
    this.confirm
      .confirm({
        title: 'Accept this proposal?',
        body: 'The other proposals for this project will be rejected, and an active contract will be created with the agreed price and delivery time. The project moves to in progress.',
        confirmLabel: 'Accept proposal',
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.proposalService.acceptProposal(proposal._id).subscribe({
          next: () => {
            this.toast.success(
              'Proposal accepted. A contract has been created.',
            );
            this.reload();
          },
          error: (err) => {
            this.toast.error(
              extractApiMessage(err, 'Unable to accept the proposal.'),
            );
          },
        });
      });
  }

  reject(proposal: Proposal): void {
    this.proposalService.rejectProposal(proposal._id).subscribe({
      next: () => {
        this.toast.success('Proposal rejected.');
        this.reload();
      },
      error: (err) => {
        this.toast.error(extractApiMessage(err, 'Unable to reject the proposal.'));
      },
    });
  }

  private reload(): void {
    const projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    this.proposalService.getProjectProposals(projectId, 1, 100).subscribe({
      next: (data) => {
        this.proposals.set(data.proposals);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}