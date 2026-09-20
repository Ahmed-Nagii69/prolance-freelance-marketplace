import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from '../../../core/services/resource.services';
import { Conversation } from '../../../core/models/models';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

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
            @for (conversation of conversations(); track conversation.project._id) {
              <a
                [routerLink]="['/messages/project', conversation.project._id]"
                class="pl-card pl-card--hover pl-message-hub-card"
                style="text-decoration: none"
              >
                <span class="pl-avatar pl-message-hub-avatar">
                  @if (conversation.other?.profileImage) {
                    <img [src]="conversation.other?.profileImage" alt="" />
                  } @else {
                    {{ initialsOf(conversation.other?.name ?? '?') }}
                  }
                </span>
                <div class="pl-message-hub-info">
                  <p class="pl-message-hub-title">{{ conversation.project.title }}</p>
                  <p class="pl-message-hub-participant">
                    with {{ conversation.other?.name ?? '—' }}
                  </p>
                </div>
                <div class="pl-message-hub-link">
                  @if (conversation.contractStatus) {
                    <pl-status-badge [status]="conversation.contractStatus" />
                  } @else {
                    <pl-status-badge [status]="conversation.project.status" />
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
  private readonly messageService = inject(MessageService);

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
    this.messageService.getConversations().subscribe({
      next: (data) => this.conversations.set(data.conversations),
      error: () => this.conversations.set([]),
    }).add(() => this.loading.set(false));
  }
}