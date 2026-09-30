import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { BanDialogService } from '../../../core/services/ban-dialog.service';
import { User, UserListData } from '../../../core/models/models';
import { formatDate, formatDateTime, initialsOf, roleDisplay } from '../../../core/utils/format';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-admin-users',
  standalone: true,
  imports: [RouterLink, PaginationControls, LoadingBlock],
  template: `
    @if (loadingUsers()) {
      <pl-loading />
    } @else {
      <div class="pl-panel">
        <div class="pl-table-wrap">
          <table class="pl-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user._id) {
                <tr>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="pl-avatar pl-avatar--sm">
                        @if (user.profileImage) {
                          <img [src]="user.profileImage" alt="" />
                        } @else {
                          {{ initialsOf(user.name) }}
                        }
                      </span>
                      <div style="min-width: 0">
                        <p class="mb-0 fw-semibold" style="font-size: 0.92rem">
                          {{ user.name }}
                        </p>
                        <a
                          [routerLink]="['/users', user._id]"
                          class="pl-faded-link"
                          style="font-size: 0.82rem"
                          >{{ user.email }}</a
                        >
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="pl-tag">{{ roleDisplay(user.role) }}</span>
                  </td>
                  <td>
                    @if (isBanned(user)) {
                      <span class="pl-tag pl-tag--danger">Suspended</span>
                      <p class="pl-faint mb-0 mt-1" style="font-size: 0.78rem">
                        @if (user.banReason) {
                          {{ user.banReason }}
                        }
                        @if (user.bannedUntil) {
                          Until {{ formatDateTime(user.bannedUntil) }}
                        } @else {
                          No end date
                        }
                      </p>
                    } @else {
                      <span class="pl-tag">Active</span>
                    }
                  </td>
                  <td class="pl-faint" style="font-size: 0.85rem">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  <td class="text-end">
                    <div class="d-inline-flex gap-2">
                      @if (isBanned(user)) {
                        <button
                          type="button"
                          class="pl-btn pl-btn--outline pl-btn--sm"
                          [disabled]="busy() === user._id"
                          (click)="liftBan(user)"
                        >
                          Lift ban
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="pl-btn pl-btn--outline pl-btn--sm"
                          [disabled]="!canBan(user) || busy() === user._id"
                          [title]="banTitle(user)"
                          (click)="startBan(user)"
                        >
                          Suspend
                        </button>
                      }
                      <button
                        type="button"
                        class="pl-btn pl-btn--danger pl-btn--sm"
                        [disabled]="user._id === myId()"
                        [title]="user._id === myId() ? 'You cannot delete your own account' : 'Delete user'"
                        (click)="removeUser(user)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center pl-faint py-4">
                    No users found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (pagination(); as p) {
          <div class="mt-4">
            <pl-pagination [data]="p" (pageChange)="loadUsers($event)" />
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .pl-tag--danger {
        background: rgba(105, 68, 81, 0.12);
        color: var(--pl-burgundy);
        border-color: rgba(105, 68, 81, 0.32);
      }
    `,
  ],
})
export class AdminUsers implements OnInit {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly banDialog = inject(BanDialogService);

  protected readonly loadingUsers = signal(true);
  protected readonly users = signal<User[]>([]);
  protected readonly pagination = signal<NonNullable<UserListData>['pagination'] | null>(null);
  protected readonly myId = signal('');
  protected readonly busy = signal('');

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;

  constructor() {
    this.myId.set(this.auth.user()?._id ?? '');
  }

  ngOnInit(): void {
    this.loadUsers(1);
  }

  loadUsers(page: number): void {
    this.loadingUsers.set(true);
    this.userService.getUsers(page, 10).subscribe({
      next: (data) => {
        this.users.set(data.users);
        this.pagination.set(data.pagination);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false),
    });
  }

  /**
   * The server only returns a live suspension, so this mirrors its own rule
   * rather than trusting a stale flag left behind by an expired ban.
   */
  isBanned(user: User): boolean {
    if (!user.isBanned) {
      return false;
    }
    if (!user.bannedUntil) {
      return true;
    }
    const until = new Date(user.bannedUntil).getTime();
    return Number.isNaN(until) ? true : until > Date.now();
  }

  // Mirrors the server: an admin can never ban themselves or another admin.
  canBan(user: User): boolean {
    return user._id !== this.myId() && user.role !== 'ADMIN';
  }

  banTitle(user: User): string {
    if (user._id === this.myId()) {
      return 'You cannot suspend your own account';
    }
    if (user.role === 'ADMIN') {
      return 'An admin account cannot be suspended';
    }
    return 'Suspend this account';
  }

  startBan(user: User): void {
    this.banDialog
      .open({ target: { id: user._id, name: user.name } })
      .subscribe((decision) => {
        if (!decision) return;
        this.busy.set(user._id);
        this.userService
          .banUser(user._id, decision.durationDays, decision.reason)
          .subscribe({
            next: ({ user: updated }) => {
              this.busy.set('');
              this.toast.success(`${updated.name} is suspended.`);
              this.replace(updated);
            },
            error: (err) => {
              this.busy.set('');
              this.toast.error(
                extractApiMessage(err, 'Unable to suspend this account.'),
              );
            },
          });
      });
  }

  liftBan(user: User): void {
    this.confirm
      .confirm({
        title: `Lift the ban on ${user.name}?`,
        body: 'They will be able to sign in and use the platform again straight away.',
        confirmLabel: 'Lift ban',
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.busy.set(user._id);
        this.userService.unbanUser(user._id).subscribe({
          next: ({ user: updated }) => {
            this.busy.set('');
            this.toast.success(`${updated.name} can use the platform again.`);
            this.replace(updated);
          },
          error: (err) => {
            this.busy.set('');
            this.toast.error(
              extractApiMessage(err, 'Unable to lift the ban.'),
            );
          },
        });
      });
  }

  removeUser(user: User): void {
    this.confirm
      .confirm({
        title: `Delete ${user.name}?`,
        body: 'Their profile, projects, proposals, contracts, messages, reviews, wallet transactions and disputes will all be removed. This works even if they have an active contract.',
        confirmLabel: 'Delete user',
        danger: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        this.userService.deleteUserByAdmin(user._id).subscribe({
          next: () => {
            this.toast.success(`${user.name} deleted.`);
            this.users.update((items) =>
              items.filter((item) => item._id !== user._id),
            );
          },
          error: (err) =>
            this.toast.error(
              extractApiMessage(err, 'Unable to delete this user.'),
            ),
        });
      });
  }

  /** Puts the server's copy of the row back in place, no refetch needed. */
  private replace(updated: User): void {
    this.users.update((items) =>
      items.map((item) => (item._id === updated._id ? updated : item)),
    );
  }
}
