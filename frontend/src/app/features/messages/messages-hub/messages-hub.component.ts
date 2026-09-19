import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ContractService,
  ProposalService,
} from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { Contract, Proposal, User } from '../../../core/models/models';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

interface Conversation {
  projectId: string;
  title: string;
  projectStatus: string;
  other: { name: string; _id: string; profileImage?: string } | null;
  contractStatus?: string;
}

@Component({
  selector: 'pl-messages-hub',
  standalone: true,
  imports: [RouterLink, StatusBadge, LoadingBlock, EmptyState,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Direct messages</p>
        <h1 class="pl-headline mb-0">Messages</h1>
        <p class="pl-muted mt-2 mb-0">
          Project conversations with the people you're working with.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (conversations().length === 0) {
          <pl-empty-state
            title="No conversations yet"
            body="Once you have a proposal accepted, an active contract, or a project with a freelancer, you can message within that project."
          />
        } @else {
          <div class="d-flex flex-column gap-2">
            @for (conversation of conversations(); track conversation.projectId) {
              <a
                [routerLink]="['/messages/project', conversation.projectId]"
                class="pl-card pl-card--hover"
                style="text-decoration: none; flex-direction: row; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap"
              >
                <div class="d-flex align-items-center gap-3 flex-grow-1">
                  <span class="pl-avatar">
                    @if (conversation.other?.profileImage) {
                      <img [src]="conversation.other?.profileImage" alt="" />
                    } @else {
                      {{ initialsOf(conversation.other?.name ?? '?') }}
                    }
                  </span>
                  <div>
                    <p class="mb-0 fw-semibold">{{ conversation.title }}</p>
                    <p class="pl-faint mb-0" style="font-size: 0.88rem">
                      with {{ conversation.other?.name ?? '—' }}
                    </p>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-3">
                  @if (conversation.contractStatus) {
                    <pl-status-badge [status]="conversation.contractStatus" />
                  } @else {
                    <pl-status-badge [status]="conversation.projectStatus" />
                  }
                  <span aria-hidden="true" class="pl-faded-link">→</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class MessagesHub {
  private readonly contractService = inject(ContractService);
  private readonly proposalService = inject(ProposalService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly conversations = signal<Conversation[]>([]);

  protected readonly initialsOf = (name: string): string =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';

  constructor() {
    const me = this.auth.user();
    if (!me) {
      this.loading.set(false);
      return;
    }

    const map = new Map<string, Conversation>();

    this.contractService.getContracts(1, 100).subscribe({
      next: (data) => {
        for (const contract of data.contracts) {
          const other = this.otherOf(contract.client, contract.freelancer, me);
          map.set(contract.project._id, {
            projectId: contract.project._id,
            title: contract.project.title,
            projectStatus: contract.project.status,
            other,
            contractStatus: contract.status,
          });
        }
      },
      error: () => void 0,
    });

    if (me.role === 'FREELANCER') {
      this.proposalService.getMyProposals(1, 100).subscribe({
        next: (data) => {
          for (const proposal of data.proposals) {
            const projectId = this.projectIdOf(proposal);
            if (!projectId || map.has(projectId)) continue;
            map.set(projectId, {
              projectId,
              title: this.projectTitleOf(proposal),
              projectStatus: this.projectStatusOf(proposal),
              other: null,
            });
          }
          this.finish(map);
        },
        error: () => this.finish(map),
      });
    } else {
      this.finish(map);
    }
  }

  private finish(map: Map<string, Conversation>): void {
    this.conversations.set(Array.from(map.values()));
    this.loading.set(false);
  }

  private otherOf(
    client: User,
    freelancer: User,
    me: User,
  ): { name: string; _id: string; profileImage?: string } | null {
    const other = client._id === me._id ? freelancer : client;
    return other
      ? { name: other.name, _id: other._id, profileImage: other.profileImage }
      : null;
  }

  private projectIdOf(proposal: Proposal): string {
    return typeof proposal.project === 'object'
      ? proposal.project._id
      : proposal.project;
  }

  private projectTitleOf(proposal: Proposal): string {
    return typeof proposal.project === 'object' && proposal.project.title
      ? proposal.project.title
      : 'Project';
  }

  private projectStatusOf(proposal: Proposal): string {
    return typeof proposal.project === 'object' &&
      proposal.project.status
      ? proposal.project.status
      : '';
  }
}