import {
  Component,
  computed,
  effect,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TablerIconComponent } from '@tabler/icons-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/resource.services';
import { MessageService } from '../../core/services/resource.services';
import { SavedFreelancerService } from '../../core/services/resource.services';
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
            <a routerLink="/projects" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" class="pl-nav__link">
              Projects
            </a>
            <a routerLink="/contact" routerLinkActive="is-active" class="pl-nav__link">
              Contact
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
              @if (currentUser.role !== 'ADMIN') {
                <a routerLink="/contracts" routerLinkActive="is-active" class="pl-nav__link">
                  Contracts
                </a>
              }
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

              @if (currentUser.role === 'CLIENT') {
                <a
                  routerLink="/saved-freelancers"
                  class="pl-icon-btn"
                  aria-label="Saved freelancers"
                  title="Saved freelancers"
                >
                  <tabler-icon icon="heart" [size]="20" />
                  @if (savedCount() > 0) {
                    <span class="pl-badge-dot pl-badge-dot--bell">
                      {{ savedCount() > 99 ? '99+' : savedCount() }}
                    </span>
                  }
                </a>
              }

              @if (currentUser.role === 'ADMIN') {
                <a routerLink="/profile" class="pl-header__user">
                  <span class="pl-avatar">
                    @if (currentUser.profileImage) {
                      <img [src]="currentUser.profileImage" alt="" />
                    } @else {
                      {{ initialsOf(currentUser.name) }}
                    }
                  </span>
                  <span class="d-none d-md-inline">Admin</span>
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
                <div class="pl-usermenu">
                  <button
                    type="button"
                    class="pl-header__user pl-header__user--trigger"
                    (click)="toggleUserMenu()"
                    [attr.aria-expanded]="userMenuOpen()"
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <span class="pl-avatar">
                      @if (currentUser.profileImage) {
                        <img [src]="currentUser.profileImage" alt="" />
                      } @else {
                        {{ initialsOf(currentUser.name) }}
                      }
                    </span>
                    <span class="d-none d-md-inline pl-header__user-name">
                      {{ currentUser.name }}
                    </span>
                    <tabler-icon
                      class="d-none d-md-inline"
                      icon="chevron-down"
                      [size]="16"
                    />
                  </button>

                  @if (userMenuOpen()) {
                    <div class="pl-usermenu__panel" role="menu">
                      <div class="pl-usermenu__head">
                        <span class="pl-avatar">
                          @if (currentUser.profileImage) {
                            <img [src]="currentUser.profileImage" alt="" />
                          } @else {
                            {{ initialsOf(currentUser.name) }}
                          }
                        </span>
                        <span class="pl-usermenu__id">
                          <span class="pl-usermenu__name">
                            {{ currentUser.name }}
                          </span>
                          <span class="pl-usermenu__role">
                            {{ roleDisplay(currentUser.role) }}
                          </span>
                        </span>
                      </div>

                      <a
                        routerLink="/profile"
                        class="pl-usermenu__item"
                        role="menuitem"
                        (click)="closeUserMenu()"
                      >
                        <tabler-icon icon="user" [size]="18" />
                        Profile
                      </a>
                      <a
                        routerLink="/dashboard"
                        class="pl-usermenu__item"
                        role="menuitem"
                        (click)="closeUserMenu()"
                      >
                        <tabler-icon icon="dashboard" [size]="18" />
                        Dashboard
                      </a>
                      <button
                        type="button"
                        class="pl-usermenu__item pl-usermenu__item--danger"
                        role="menuitem"
                        (click)="logout()"
                      >
                        <tabler-icon icon="logout" [size]="18" />
                        Log out
                      </button>
                    </div>
                  }
                </div>
              }
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
  private readonly savedService = inject(SavedFreelancerService);

  readonly user = computed<User | null>(() => this.auth.user());
  readonly notifications = signal<Notification[]>([]);
  readonly msgUnread = signal(0);
  readonly notifUnread = signal(0);
  readonly savedCount = signal(0);
  protected readonly notifOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
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
        this.savedCount.set(0);
        this.notifOpen.set(false);
        this.userMenuOpen.set(false);
      }
    });

    this.refreshTimer = setInterval(() => this.loadBadges(), 30000);

    // Saving or removing a freelancer happens on other pages, so the badge is
    // refreshed on every navigation to stay in sync.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.loadSavedCount());
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
    if (
      this.userMenuOpen() &&
      !(event.target as HTMLElement)?.closest('.pl-usermenu')
    ) {
      this.userMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.notifOpen.set(false);
    this.userMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
    this.notifOpen.set(false);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.notifOpen.set(false);
    this.auth.logout();
  }

  openNotifications(): void {
    this.notifOpen.update((value) => !value);
    this.userMenuOpen.set(false);
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
      this.savedCount.set(0);
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
    if (currentUser.role === 'CLIENT') {
      this.loadSavedCount();
    } else {
      this.savedCount.set(0);
    }
  }

  private loadSavedCount(): void {
    if (this.user()?.role !== 'CLIENT') {
      this.savedCount.set(0);
      return;
    }
    this.savedService.getSavedCount().subscribe({
      next: (data) => this.savedCount.set(data.count),
      error: () => void 0,
    });
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