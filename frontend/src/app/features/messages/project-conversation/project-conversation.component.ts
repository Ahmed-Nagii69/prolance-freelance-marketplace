import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ContractService,
  MessageService,
  ProposalService,
} from '../../../core/services/resource.services';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Contract,
  Message,
  Project,
  User,
} from '../../../core/models/models';
import { formatDateTime, initialsOf } from '../../../core/utils/format';

import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-project-conversation',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingBlock, EmptyState],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <a routerLink="/messages" class="pl-faded-link">← All messages</a>
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mt-3">
          <div>
            <p class="pl-kicker">Project conversation</p>
            <h1 class="pl-headline mb-0">{{ project()?.title ?? 'Messages' }}</h1>
          </div>
          @if (project(); as currentProject) {
            <a
              [routerLink]="['/projects', currentProject._id]"
              class="pl-btn pl-btn--outline pl-btn--sm"
              >View project</a
            >
          }
        </div>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="pl-panel" style="padding: 0">
          <div
            #scrollPane
            class="pl-chat-scroll"
            style="max-height: 62vh; overflow-y: auto; padding: 1.4rem; gap: 1rem"
          >
            @if (loading()) {
              <pl-loading />
            } @else if (messages().length === 0) {
              <pl-empty-state
                title="No messages yet"
                body="This conversation is open. Send the first message."
              />
            } @else {
              @for (message of messages(); track message._id) {
                <div
                  class="pl-message"
                  [class.pl-message--own]="own(message)"
                >
                  <div class="flex-grow-1">
                    <div class="pl-message__meta mb-1">
                      {{ message.sender.name }} ·
                      {{ formatDateTime(message.createdAt) }}
                    </div>
                    <div style="white-space: pre-line">{{ message.content }}</div>
                  </div>
                  @if (!own(message) && !message.isRead) {
                    <span class="pl-faint" style="font-size: 0.72rem">new</span>
                  }
                </div>
              }
            }
          </div>

          @if (error(); as message) {
            <div
              class="pl-message m-3"
              style="border-color: rgba(105,68,81,.4); color: var(--pl-burgundy)"
              role="alert"
            >
              {{ message }}
            </div>
          }

          @if (conversationOpen()) {
            <form
              (ngSubmit)="send()"
              novalidate
              class="d-flex gap-2"
              style="border-top: 1px solid var(--pl-line); padding: 1rem"
            >
              <input
                id="msg-content"
                type="text"
                class="pl-input"
                maxlength="5000"
                [(ngModel)]="draft"
                name="content"
                placeholder="Write a message…"
                autocomplete="off"
              />
              <button
                type="submit"
                class="pl-btn pl-btn--accent"
                [disabled]="sending() || !draft().trim()"
              >
                {{ sending() ? 'Sending…' : 'Send' }}
              </button>
            </form>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProjectConversation implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly messageService = inject(MessageService);
  private readonly contractService = inject(ContractService);
  private readonly proposalService = inject(ProposalService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly scrollPane = viewChild<ElementRef<HTMLDivElement>>('scrollPane');
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly project = signal<Project | null>(null);
  protected readonly messages = signal<Message[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly draft = signal('');
  protected readonly conversationOpen = signal(false);
  protected readonly counterparty = signal<User | null>(null);

  protected readonly formatDateTime = formatDateTime;
  protected readonly initialsOf = initialsOf;

  get projectId(): string {
    return this.route.snapshot.paramMap.get('projectId') ?? '';
  }

  ngOnInit(): void {
    const projectId = this.projectId;
    this.projectService.getProject(projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.resolveCounterparty(project);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/messages']);
      },
    });

    this.refresh();
    this.pollTimer = setInterval(() => this.refresh(true), 10000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  private resolveCounterparty(project: Project): void {
    const me = this.auth.user();
    if (!me) return;

    if (typeof project.client === 'object' && project.client._id === me._id) {
      this.contractService.getContracts(1, 100).subscribe({
        next: (data) => {
          const match = data.contracts.find(
            (contract) => contract.project._id === project._id,
          );
          if (match) {
            this.counterparty.set(match.freelancer);
            this.conversationOpen.set(true);
          } else {
            this.contractNeeded();
          }
        },
        error: () => this.contractNeeded(),
      });
    } else {
      this.proposalService.getMyProposals(1, 100).subscribe({
        next: (data) => {
          const found = data.proposals.find(
            (proposal) =>
              typeof proposal.project === 'object' &&
              proposal.project._id === project._id,
          );
          if (found) {
            if (typeof project.client === 'object') {
              this.counterparty.set(project.client as User);
            }
            this.conversationOpen.set(true);
          }
        },
        error: () => void 0,
      });
    }
  }

  private contractNeeded(): void {
    this.conversationOpen.set(
      this.messages().length > 0 || this.counterparty() !== null,
    );
  }

  refresh(silent = false): void {
    if (!silent) this.loading.set(true);
    this.messageService.getProjectMessages(this.projectId, 1, 100).subscribe({
      next: (data) => {
        const previous = this.messages();
        const newMessages = data.messages;
        this.messages.set(newMessages);

        if (!silent || previous.length !== newMessages.length) {
          this.scrollToBottom();
        }

        this.markUnread(newMessages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.conversationOpen.set(false);
        this.error.set("You don't have access to this conversation.");
      },
    });
  }

  private markUnread(messages: Message[]): void {
    const me = this.auth.user();
    if (!me) return;
    for (const message of messages) {
      if (
        typeof message.receiver === 'object' &&
        message.receiver._id === me._id &&
        !message.isRead
      ) {
        this.messageService.markMessageAsRead(message._id).subscribe({
          error: () => void 0,
        });
      }
    }
  }

  private scrollToBottom(): void {
    window.setTimeout(() => {
      const pane = this.scrollPane()?.nativeElement;
      if (pane) {
        pane.scrollTop = pane.scrollHeight;
      }
    }, 0);
  }

  own(message: Message): boolean {
    const me = this.auth.user();
    return me !== null && message.sender?._id === me._id;
  }

  send(): void {
    const content = this.draft().trim();
    const receiver = this.counterparty();
    if (!content || !receiver || !this.projectId) return;

    this.sending.set(true);
    this.error.set('');
    this.messageService
      .sendMessage({
        receiver: receiver._id,
        project: this.projectId,
        content,
      })
      .subscribe({
        next: (message) => {
          this.messages.update((items) => [...items, message]);
          this.draft.set('');
          this.sending.set(false);
          this.scrollToBottom();
        },
        error: (err) => {
          this.error.set(extractApiMessage(err, 'Unable to send the message.'));
          this.sending.set(false);
        },
      });
  }
}