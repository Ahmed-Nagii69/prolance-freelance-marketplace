import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { DisputeNoticeService } from '../../../core/services/dispute-notice.service';
import {
  ContractService,
  ProposalService,
} from '../../../core/services/resource.services';
import {
  Contract,
  Dispute,
  Project,
  Proposal,
  User,
} from '../../../core/models/models';
import {
  formatCurrencyRange,
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
    TablerIconComponent,
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
          @if (disputeNotice(); as notice) {
            <div
              class="d-flex align-items-start gap-3 mb-4"
              role="status"
              style="
                padding: 1rem 1.15rem;
                border: 1px solid rgba(160, 82, 30, 0.35);
                border-left: 4px solid #a0521e;
                border-radius: var(--pl-radius);
                background-color: rgba(160, 82, 30, 0.07);
                color: var(--pl-ink);
              "
            >
              <tabler-icon icon="scale" [size]="20" />
              <div>
                <p class="mb-1 fw-semibold">
                  {{
                    notice.status === 'UNDER_REVIEW'
                      ? 'This project is under dispute review'
                      : 'This project is under dispute'
                  }}
                </p>
                <p class="mb-0" style="font-size: 0.92rem">
                  {{ notice.raisedByName }} opened a dispute: {{ notice.reason }}.
                  A ProLance admin decides how the held payment is settled, so
                  nothing can be submitted, approved or cancelled in the meantime.
                  @if (notice.contractId) {
                    <a [routerLink]="['/contracts', notice.contractId]"
                      >Read the case file</a
                    >.
                  }
                </p>
              </div>
            </div>
          }
          <div class="row g-4">
            <div class="col-12 col-lg-8">
              <div class="pl-panel mb-4">
                <p class="pl-label mb-2">The brief</p>
                <p style="white-space: pre-line; line-height: 1.8; overflow-wrap: anywhere">
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
                      @if (client.profileImage) {
                        <img [src]="client.profileImage" alt="" />
                      } @else {
                        {{ initialsOf(client.name) }}
                      }
                    </span>
                    <div>
                      <p class="mb-0 fw-semibold">{{ client.name }}</p>
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
                  @if (proposalCount() === 1) {
                    View the 1 proposal for this project
                  } @else {
                    View the {{ proposalCount() }} proposals for this project
                  }
                </a>
              }
            </div>

            <div class="col-12 col-lg-4">
              <div class="pl-panel" style="position: sticky; top: 90px">
                <p class="pl-label">Terms</p>
                <div class="d-flex flex-column gap-3 mt-1">
                  <div class="pl-stat">
                    <span class="pl-stat__value">{{ formatCurrencyRange(project()!.minBudget, project()!.maxBudget) }}</span>
                    <span class="pl-stat__label">Budget range</span>
                  </div>
                  <div class="pl-stat" style="border-left-color: var(--pl-purple)">
                    <span class="pl-stat__value" style="font-size: 1.5rem">
                      {{ project()!.durationDays }} days
                    </span>
                    <span class="pl-stat__label">Duration</span>
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
                      This is your project. Proposals from freelancers will
                      appear here, and you can review and accept them.
                    </div>
                  } @else if (currentUser.role === 'FREELANCER') {
                    @if (project()!.status === 'OPEN') {
                      @if (myProposal(); as mine) {
                        <div class="pl-message">
                          You already submitted a proposal for this project.
                          Its status is
                          <strong>{{ mine.status.replace('_', ' ') }}</strong
                          >.
                        </div>
                        @if (canEditMyProposal()) {
                          <button
                            type="button"
                            class="pl-btn pl-btn--accent w-100 mt-3"
                            (click)="editingMyProposal.set(!editingMyProposal())"
                          >
                            {{
                              editingMyProposal()
                                ? 'Close the editor'
                                : 'Edit your proposal'
                            }}
                          </button>
                        } @else {
                          <p class="pl-field-hint mt-2 mb-0">
                            {{
                              isProposalEdited(mine)
                                ? 'You already used your one edit on this proposal.'
                                : 'This proposal can no longer be edited.'
                            }}
                          </p>
                        }
                      } @else {
                        <div class="pl-message">
                          This project is open for proposals — use the form
                          below to apply.
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

          @if (canSubmitProposal()) {
            <div class="row mt-4">
              <div class="col-12">
                <div class="pl-panel">
                  <p class="pl-kicker mb-1">Apply</p>
                  <h2 class="pl-headline mb-1" style="font-size: 1.8rem">
                    Submit a proposal
                  </h2>
                  <p class="pl-faint mb-3" style="font-size: 0.9rem">
                    Bids are accepted between
                    {{ formatCurrencyRange(project()!.minBudget, project()!.maxBudget) }}.
                  </p>
                  <pl-submit-proposal
                    [projectId]="project()!._id"
                    [projectDurationDays]="project()!.durationDays"
                    (submitted)="onProposalSubmitted()"
                  />
                </div>
              </div>
            </div>
          }

          @if (editingMyProposal() && myProposal(); as mine) {
            <div class="row mt-4">
              <div class="col-12">
                <div class="pl-panel">
                  <p class="pl-kicker mb-1">Revise</p>
                  <h2 class="pl-headline mb-1" style="font-size: 1.8rem">
                    Edit your proposal
                  </h2>
                  <p class="pl-faint mb-3" style="font-size: 0.9rem">
                    You can revise a submitted bid once. Saving here uses that
                    single edit.
                  </p>
                  <pl-submit-proposal
                    [proposal]="mine"
                    [projectId]="project()!._id"
                    [projectDurationDays]="project()!.durationDays"
                    (saved)="onMyProposalSaved($event)"
                    (cancelled)="editingMyProposal.set(false)"
                  />
                </div>
              </div>
            </div>
          }
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
  private readonly disputeNoticeDialog = inject(DisputeNoticeService);

  protected readonly loading = signal(true);
  protected readonly project = signal<Project | null>(null);
  protected readonly myProposal = signal<Proposal | null>(null);
  protected readonly editingMyProposal = signal(false);
  protected readonly contracts = signal<Contract[]>([]);
  protected readonly dispute = signal<Dispute | null>(null);

  protected readonly user = this.auth.user;
  protected readonly formatCurrencyRange = formatCurrencyRange;
  protected readonly formatDate = formatDate;
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
        this.loadDispute(project);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/projects']);
      },
    });
  }

  /**
   * A project that is not disputed makes no request here. When it is, the
   * server decides whether this viewer is one of the two parties, so a visitor
   * who is not involved simply gets nothing back and sees only the status
   * badge.
   */
  private loadDispute(project: Project): void {
    if (project.status !== 'DISPUTED' || !this.auth.user()) {
      return;
    }

    this.projectService.getProjectDispute(project._id).subscribe({
      next: ({ dispute }) => {
        if (!dispute) return;
        this.dispute.set(dispute);
        // Opened once, on arrival. The banner above stays on the page afterwards,
        // so closing the dialog never hides the state it reported.
        this.disputeNoticeDialog.open({
          projectTitle: project.title,
          status: dispute.status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'OPEN',
          reason: dispute.reason,
          raisedByName: this.partyName(dispute.raisedBy),
          openedAt: dispute.createdAt,
          contractId:
            typeof dispute.contract === 'string'
              ? dispute.contract
              : (dispute.contract?._id ?? null),
        });
      },
      error: () => void 0,
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
    this.editingMyProposal.set(false);
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

  clientPanel(): { name: string; _id: string; profileImage?: string } | null {
    const client = this.project()?.client;
    if (typeof client === 'object' && client !== null && '_id' in client) {
      return {
        name: client.name,
        _id: client._id,
        profileImage: client.profileImage,
      };
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

  /**
   * Only the owning client receives a count, so this is never shown to anyone
   * who has no right to see the competing bids.
   */
  proposalCount(): number {
    return this.project()?.proposalCount ?? 0;
  }

  canSubmitProposal(): boolean {
    const currentUser = this.auth.user();
    return (
      currentUser?.role === 'FREELANCER' &&
      this.project()?.status === 'OPEN' &&
      !this.myProposal()
    );
  }

  // A bid is revisable exactly once, and only while it is still pending on an
  // open project. The server enforces the same rules.
  canEditMyProposal(): boolean {
    const proposal = this.myProposal();
    return (
      !!proposal &&
      proposal.status === 'PENDING' &&
      (proposal.editCount ?? 0) < 1 &&
      this.project()?.status === 'OPEN'
    );
  }

  isProposalEdited(proposal: Proposal): boolean {
    return (proposal.editCount ?? 0) >= 1;
  }

  onMyProposalSaved(updated: Proposal): void {
    this.editingMyProposal.set(false);
    this.myProposal.set(updated);
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
      edit: isOwner && project.status === 'OPEN',
      // Deleting would take the contract, the case file and its history with
      // it, so it stays out of reach for as long as the dispute is running.
      delete: isOwner && project.status !== 'DISPUTED',
      messages: canMessage,
    };
  }

  /**
   * The subset of the dispute the page can safely describe: who opened it, why,
   * and where to read the rest. Null for a project nobody in dispute.
   */
  disputeNotice(): {
    status: 'OPEN' | 'UNDER_REVIEW';
    reason: string;
    raisedByName: string;
    contractId: string | null;
  } | null {
    const dispute = this.dispute();
    if (!dispute) return null;
    return {
      status: dispute.status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'OPEN',
      reason: dispute.reason,
      raisedByName: this.partyName(dispute.raisedBy),
      contractId:
        typeof dispute.contract === 'string'
          ? dispute.contract
          : (dispute.contract?._id ?? null),
    };
  }

  private partyName(value: Dispute['raisedBy']): string {
    if (typeof value === 'string') {
      return 'A party';
    }
    return value?.name ?? 'A party';
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