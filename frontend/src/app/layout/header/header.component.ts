import {
  Component,
  computed,
  effect,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/resource.services';
import { MessageService } from '../../core/services/resource.services';
import { initialsOf, roleDisplay, timeAgo } from '../../core/utils/format';
import { Notification, User } from '../../core/models/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TablerIconComponent],
  template: `
    <header class="pl-header">
      <div class="pl-container">
        <div class="pl-header__inner">
          <a routerLink="/" class="pl-brand" aria-label="ProLance home">
            ProLance<span class="pl-brand__dot">.</span>
          </a>

          <nav
            class="pl-nav"
            [class.is-open]="menuOpen()"
            aria-label="Primary"
          >
            <a routerLink="/projects" routerLinkActive="is-active" class="pl-nav__link">
              Projects
            </a>

            @if (user(); as currentUser) {
              @if (currentUser.role === 'CLIENT') {
                <a routerLink="/projects/my" routerLinkActive="is-active" class="pl-nav__link">
                  My projects
                </a>
              }
              @if (currentUser.role === 'FREELANCER') {
                <a routerLink="/proposals/my" routerLinkActive="is-active" class="pl-nav__link">
                  My proposals
                </a>
              }
              <a routerLink="/contracts" routerLinkActive="is-active" class="pl-nav__link">
                Contracts
              </a>
              @if (currentUser.role !== 'ADMIN') {
                <a
                  routerLink="/messages"
                  routerLinkActive="is-active"
                  class="pl-nav__link pl-nav__link--badge"
                >
                  Messages
                  @if (msgUnread() > 0) {
                    <span class="pl-badge-dot">{{ msgUnread() > 99 ? '99+' : msgUnread() }}</span>
                  }
                </a>
              }
              @if (currentUser.role === 'ADMIN') {
                <a routerLink="/admin" routerLinkActive="is-active" class="pl-nav__link">
                  Admin
                </a>
              }
            }
          </nav>

          <div class="pl-header__actions">
            @if (user(); as currentUser) {
              <div class="pl-notif">
                <button
                  type="button"
                  class="pl-icon-btn"
                  (click)="openNotifications()"
                  aria-label="Notifications"
                >
                  <tabler-icon icon="bell" [size]="20" />
                  @if (notifUnread() > 0) {
                    <span class="pl-badge-dot pl-badge-dot--bell">
                      {{ notifUnread() > 99 ? '99+' : notifUnread() }}
                    </span>
                  }
                </button>

                @if (notifOpen()) {
                  <div class="pl-notif__panel">
                    <div class="pl-notif__head">
                      <strong>Notifications</strong>
                      @if (notifUnread() > 0) {
                        <button
                          type="button"
                          class="pl-btn pl-btn--link pl-btn--sm"
                          (click)="markAllNotificationsRead()"
                        >
                          Mark all read
                        </button>
                      }
                    </div>
                    <div class="pl-notif__list">
                      @if (notifications().length === 0) {
                        <p class="pl-notif__empty">You're all caught up.</p>
                      }
                      @for (item of notifications(); track item._id) {
                        <button
                          type="button"
                          class="pl-notif__item"
                          [class.is-unread]="!item.isRead"
                          (click)="markNotificationRead(item)"
                        >
                          @if (item.actor && item.actor.profileImage) {
                            <span class="pl-avatar pl-avatar--sm">
                              <img [src]="item.actor.profileImage" alt="" />
                            </span>
                          } @else {
                            <span class="pl-avatar pl-avatar--sm">
                              {{ item.actor ? initialsOf(item.actor.name) : '·' }}
                            </span>
                          }
                          <span class="pl-notif__text">
                            <span class="pl-notif__msg">{{ item.message }}</span>
                            <span class="pl-notif__time">
                              {{ item.actor?.name ? item.actor.name + ' · ' : '' }}{{ timeAgo(item.createdAt) }}
                            </span>
                          </span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <a routerLink="/profile" class="pl-header__user">
                <span class="pl-avatar">
                  @if (currentUser.profileImage) {
                    <img [src]="currentUser.profileImage" alt="" />
                  } @else {
                    {{ initialsOf(currentUser.name) }}
                  }
                </span>
                <span class="d-none d-md-inline">
                  {{
                    currentUser.role === 'ADMIN'
                      ? 'Admin'
                      : roleDisplay(currentUser.role)
                  }}
                </span>
              </a>
              <button
                type="button"
                class="pl-btn pl-btn--outline pl-btn--sm"
                (click)="logout()"
                aria-label="Log out"
              >
                Log out
              </button>
            } @else {
              <a routerLink="/auth/login" class="pl-btn pl-btn--outline pl-btn--sm">
                Log in
              </a>
              <a routerLink="/auth/register" class="pl-btn pl-btn--accent pl-btn--sm">
                Join ProLance
              </a>
            }

            <button
              type="button"
              class="pl-menu-btn"
              (click)="toggleMenu()"
              aria-label="Toggle navigation"
              aria-expanded="false"
            >
              <tabler-icon icon="menu-2" [size]="22" />
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class Header implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationService);
  private readonly messagesService = inject(MessageService);

  readonly user = computed<User | null>(() => this.auth.user());
  readonly notifications = signal<Notification[]>([]);
  readonly msgUnread = signal(0);
  readonly notifUnread = signal(0);
  protected readonly notifOpen = signal(false);
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;
  protected readonly timeAgo = timeAgo;
  protected readonly menuOpen = signal(false);

  private readonly refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        this.loadBadges();
        this.loadNotifications();
      } else {
        this.notifications.set([]);
        this.msgUnread.set(0);
        this.notifUnread.set(0);
        this.notifOpen.set(false);
      }
    });

    this.refreshTimer = setInterval(() => this.loadBadges(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.notifOpen() && !(event.target as HTMLElement)?.closest('.pl-notif')) {
      this.notifOpen.set(false);
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  logout(): void {
    this.auth.logout();
  }

  openNotifications(): void {
    this.notifOpen.update((value) => !value);
    if (this.notifOpen()) {
      this.loadNotifications();
    }
  }

  markNotificationRead(item: Notification): void {
    if (!item.isRead) {
      this.notificationsService.markAsRead(item._id).subscribe({
        error: () => void 0,
      });
      item.isRead = true;
      this.notifUnread.update((count) => Math.max(0, count - 1));
    }
    this.notifOpen.set(false);
    if (item.link) {
      void this.router.navigateByUrl(item.link);
    }
  }

  markAllNotificationsRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((item) => ({ ...item, isRead: true })),
        );
        this.notifUnread.set(0);
      },
      error: () => void 0,
    });
  }

  private loadBadges(): void {
    const currentUser = this.user();
    if (!currentUser) {
      this.msgUnread.set(0);
      this.notifUnread.set(0);
      return;
    }
    this.notificationsService.getUnreadCount().subscribe({
      next: (data) => this.notifUnread.set(data.unreadCount),
      error: () => void 0,
    });
    if (currentUser.role !== 'ADMIN') {
      this.messagesService.getUnreadCount().subscribe({
        next: (data) => this.msgUnread.set(data.unreadCount),
        error: () => void 0,
      });
    } else {
      this.msgUnread.set(0);
    }
  }

  private loadNotifications(): void {
    this.notificationsService.getNotifications(1, 8).subscribe({
      next: (data) => {
        this.notifications.set(data.notifications);
        this.notifUnread.set(data.unreadCount);
      },
      error: () => void 0,
    });
  }
}