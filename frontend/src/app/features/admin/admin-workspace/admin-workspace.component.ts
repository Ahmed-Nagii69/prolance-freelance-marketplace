import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { User, UserListData } from '../../../core/models/models';
import {
  formatDate,
  initialsOf,
  roleDisplay,
} from '../../../core/utils/format';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { extractApiMessage } from '../../../core/utils/http-error';
import { filter, map } from 'rxjs';

@Component({
  selector: 'pl-admin-workspace',
  standalone: true,
  imports: [RouterLink, RouterOutlet, TablerIconComponent, PaginationControls, LoadingBlock],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Administration</p>
        <h1 class="pl-headline mb-0">Admin workspace</h1>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="d-flex flex-wrap gap-3 mb-4">
          <a routerLink="/admin/users" class="pl-chip" [class.is-selected]="showUsers()">
            <tabler-icon icon="users" [size]="18" />
            Users
          </a>
        </div>

        @if (showUsers()) {
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
                        <td class="pl-faint" style="font-size: 0.85rem">
                          {{ formatDate(user.createdAt) }}
                        </td>
                        <td class="text-end">
                          <button
                            type="button"
                            class="pl-btn pl-btn--danger pl-btn--sm"
                            [disabled]="user._id === myId()"
                            [title]="user._id === myId() ? 'You cannot delete your own account' : 'Delete user'"
                            (click)="removeUser(user)"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="text-center pl-faint py-4">
                          No users found.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (pagination(); as pagination) {
                <div class="mt-4">
                  <pl-pagination [data]="pagination" (pageChange)="loadUsers($event)" />
                </div>
              }
            </div>
          }
        } @else {
          <div class="pl-panel">
            <router-outlet />
          </div>
        }
      </div>
    </section>
  `,
})
export class AdminWorkspace implements OnInit {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly loadingUsers = signal(true);
  protected readonly users = signal<User[]>([]);
  protected readonly pagination = signal<NonNullable<UserListData>['pagination'] | null>(null);
  protected readonly myId = signal('');
  protected readonly showUsers = signal(false);

  protected readonly formatDate = formatDate;
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;

  constructor() {
    this.myId.set(this.auth.user()?._id ?? '');
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
      )
      .subscribe((url) => {
        this.showUsers.set(url.startsWith('/admin/users'));
        if (this.showUsers()) {
          this.loadUsers(1);
        }
      });

    // Load initial state
    this.showUsers.set(this.router.url.startsWith('/admin/users'));
    if (this.showUsers()) {
      this.loadUsers(1);
    }
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

  removeUser(user: User): void {
    this.confirm
      .confirm({
        title: `Delete ${user.name}?`,
        body: 'Their profile, projects, proposals, contracts, messages and reviews will all be removed.',
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
}
