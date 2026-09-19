import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ContractService,
  ProposalService,
} from '../../../core/services/resource.services';
import {
  Contract,
  Project,
  Proposal,
  User,
} from '../../../core/models/models';
import {
  deadlineLabel,
  formatCurrency,
  formatDate,
  initialsOf,
} from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { SubmitProposal } from '../proposal-form/proposal-form.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-project-details',
  standalone: true,
  imports: [
    RouterLink,
    StatusBadge,
    SkillTags,
    LoadingBlock,
    EmptyState,
    SubmitProposal,
  ],
  template: `
    @if (loading()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-loading />
      </div>
    } @else if (!project()) {
      <div class="pl-container" style="padding-block: 4rem">
        <pl-empty-state
          title="Project not found"
          body="This project may have been removed or the link is incorrect."
        >
          <a routerLink="/projects" class="pl-btn pl-btn--outline pl-btn--sm" pl-empty-action>
            Back to projects
          </a>
        </pl-empty-state>
      </div>
    } @else {
      <div class="pl-page-title">
        <div class="pl-container">
          <a routerLink="/projects" class="pl-faded-link">← All projects</a>
          <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mt-3">
            <div>
              <p class="pl-kicker">Project brief</p>
              <h1 class="pl-headline mb-0">{{ project()!.title }}</h1>
            </div>
            <pl-status-badge [status]="project()!.status" />
          </div>
        </div>
      </div>

      <section class="pl-section pl-section--tight">
        <div class="pl-container">
          <div class="row g-4">
            <div class="col-12 col-lg-8">
              <div class="pl-panel mb-4">
                <p class="pl-label mb-2">The brief</p>
                <p style="white-space: pre-line; line-height: 1.8">
                  {{ project()!.description }}
                </p>
              </div>

              @if (skillsPresent()) {
                <div class="pl-panel mb-4">
                  <p class="pl-label mb-2">Required skills</p>
                  <pl-skill-tags [skills]="project()!.skills" />
                </div>
              }

              @if (clientPanel(); as client) {
                <div class="pl-panel mb-4">
                  <p class="pl-label mb-2">The client</p>
                  <div class="d-flex align-items-center gap-3 flex-wrap">
                    <span class="pl-avatar pl-avatar--lg">
                      {{ initialsOf(client.name) }}
                    </span>
                    <div>
                      <p class="mb-0 fw-semibold">{{ client.name }}</p>
                      <p class="pl-faint mb-0" style="font-size: 0.9rem">
                        {{ client.email }}
                      </p>
                    </div>
                    <a
                      [routerLink]="['/users', client._id]"
                      class="pl-faded-link ms-auto"
                      >View profile →</a
                    >
                  </div>
                </div>
              }

              @if (canSeeProposals()) {
                <a
                  [routerLink]="['/projects', project()!._id, 'proposals']"
                  class="pl-btn pl-btn--dark"
                >
                  View proposals for this project
                </a>
              }
            </div>

            <div class="col-12 col-lg-4">
              <div class="pl-panel" style="position: sticky; top: 90px">
                <p class="pl-label">Terms</p>
                <div class="d-flex flex-column gap-3 mt-1">
                  <div class="pl-stat">
                    <span class="pl-stat__value">{{ formatCurrency(project()!.budget) }}</span>
                    <span class="pl-stat__label">Budget</span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-purple)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ deadlineLabel(project()!.deadline) }}
                    </span>
                    <span class="pl-stat__label">
                      Due {{ formatDate(project()!.deadline) }}
                    </span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-brass)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ formatDate(project()!.createdAt) }}
                    </span>
                    <span class="pl-stat__label">Posted</span>
                  </div>
                </div>

                <hr class="pl-rule" />

                @if (callsToAction(); as actions) {
                  <div class="d-flex flex-column gap-2">
                    @if (actions.edit) {
                      <a
                        [routerLink]="['/projects', project()!._id, 'edit']"
                        class="pl-btn pl-btn--outline"
                        >Edit project</a
                      >
                    }
                    @if (actions.delete) {
                      <button
                        type="button"
                        class="pl-btn pl-btn--danger"
                        (click)="deleteProject()"
                      >
                        Delete project
                      </button>
                    }
                    @if (actions.messages) {
                      <a
                        [routerLink]="['/messages/project', project()!._id]"
                        class="pl-btn pl-btn--purple"
                        >Open conversation</a
                      >
                    }
                  </div>
                  <hr class="pl-rule" />
                }

                @if (user(); as currentUser) {
                  @if (ownProject(currentUser)) {
                    <div class="pl-message">
                      This is your project. You can review proposals and open a
                      conversation once a contract begins.
                    </div>
                  } @else if (currentUser.role === 'FREELANCER') {
                    @if (project()!.status === 'OPEN') {
                      @if (myProposal()) {
                        <div class="pl-message">
                          You already submitted a proposal for this project.
                          Its status is
                          <strong>{{ myProposal()!.status.replace('_', ' ') }}</strong
                          >.
                        </div>
                      } @else {
                        <div>
                          <p class="pl-label mb-2">Submit a proposal</p>
                          <pl-submit-proposal
                            [projectId]="project()!._id"
                            (submitted)="onProposalSubmitted()"
                          />
                        </div>
                      }
                    } @else {
                      <div class="pl-message">
                        This project is no longer accepting proposals.
                      </div>
                    }
                  }
                } @else {
                  <div class="d-flex flex-column gap-2">
                    <a routerLink="/auth/register" class="pl-btn pl-btn--accent">
                      Join to submit a proposal
                    </a>
                    <a routerLink="/auth/login" class="pl-btn pl-btn--outline">
                      Log in
                    </a>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>
    }
  `,
})
export class ProjectDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly proposalService = inject(ProposalService);
  private readonly contractService = inject(ContractService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly project = signal<Project | null>(null);
  protected readonly myProposal = signal<Proposal | null>(null);
  protected readonly contracts = signal<Contract[]>([]);

  protected readonly user = this.auth.user;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDate = formatDate;
  protected readonly deadlineLabel = deadlineLabel;
  protected readonly initialsOf = initialsOf;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.projectService.getProject(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loading.set(false);
        this.loadSecondary(project);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/projects']);
      },
    });
  }

  private loadSecondary(project: Project): void {
    const currentUser = this.auth.user();
    if (!currentUser) return;

    if (currentUser.role === 'FREELANCER') {
      this.proposalService.getMyProposals(1, 100).subscribe({
        next: (data) => {
          const found = data.proposals.find(
            (proposal) =>
              typeof proposal.project === 'object' &&
              proposal.project !== null &&
              proposal.project._id === project._id,
          );
          this.myProposal.set(found ?? null);
        },
        error: () => void 0,
      });
    }

    this.contractService.getContracts(1, 100).subscribe({
      next: (data) =>
        this.contracts.set(
          data.contracts.filter((contract) => contract.project._id === project._id),
        ),
      error: () => void 0,
    });
  }

  onProposalSubmitted(): void {
    this.proposalService.getMyProposals(1, 100).subscribe({
      next: (data) => {
        const found = data.proposals.find(
          (proposal) =>
            typeof proposal.project === 'object' &&
            proposal.project !== null &&
            proposal.project._id === this.project()?._id,
        );
        this.myProposal.set(found ?? null);
      },
      error: () => void 0,
    });
  }

  clientPanel(): { name: string; email: string; _id: string } | null {
    const client = this.project()?.client;
    if (typeof client === 'object' && client !== null && '_id' in client) {
      return { name: client.name, email: client.email, _id: client._id };
    }
    return null;
  }

  skillsPresent(): boolean {
    return (this.project()?.skills.length ?? 0) > 0;
  }

  ownProject(user: User): boolean {
    const client = this.project()?.client;
    if (typeof client === 'object' && client !== null && '_id' in client) {
      return client._id === user._id;
    }
    return false;
  }

  canSeeProposals(): boolean {
    const currentUser = this.auth.user();
    return (
      currentUser?.role === 'CLIENT' && this.ownProject(currentUser)
    );
  }

  callsToAction(): {
    edit: boolean;
    delete: boolean;
    messages: boolean;
  } {
    const currentUser = this.auth.user();
    const project = this.project();
    if (!currentUser || !project) {
      return { edit: false, delete: false, messages: false };
    }

    const isOwner =
      currentUser.role === 'CLIENT' && this.ownProject(currentUser) === true;

    const canMessage = isOwner || this.contracts().length > 0;

    return {
      edit: isOwner,
      delete: isOwner,
      messages: canMessage,
    };
  }

  deleteProject(): void {
    const project = this.project();
    if (!project) return;
    this.confirm
      .confirm({
        title: 'Delete this project?',
        body: 'This removes the project along with its proposals, contracts, messages and reviews. This cannot be undone.',
        confirmLabel: 'Delete project',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.projectService.deleteProject(project._id).subscribe({
          next: () => {
            this.toast.success('Project deleted.');
            void this.router.navigateByUrl('/projects/my');
          },
          error: (err) => {
            this.toast.error(
              extractApiMessage(err, 'Unable to delete the project.'),
            );
          },
        });
      });
  }
}