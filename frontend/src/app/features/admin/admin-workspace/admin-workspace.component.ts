import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { SkillService } from '../../../core/services/resource.services';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Skill, User, UserListData } from '../../../core/models/models';
import {
  formatDate,
  initialsOf,
  roleDisplay,
} from '../../../core/utils/format';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { extractApiMessage } from '../../../core/utils/http-error';

@Component({
  selector: 'pl-admin-workspace',
  standalone: true,
  imports: [RouterLink, FormsModule, PaginationControls, LoadingBlock,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Administration</p>
        <h1 class="pl-headline mb-0">Admin workspace</h1>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <div class="pl-tabs mb-4" role="tablist">
          <button
            type="button"
            class="pl-tab"
            [class.is-active]="tab() === 'users'"
            (click)="tab.set('users')"
            [attr.aria-selected]="tab() === 'users'"
          >
            Users
          </button>
          <button
            type="button"
            class="pl-tab"
            [class.is-active]="tab() === 'skills'"
            (click)="tab.set('skills')"
            [attr.aria-selected]="tab() === 'skills'"
          >
            Skill catalog
          </button>
        </div>

        @if (tab() === 'users') {
          <div class="pl-panel">
            @if (loadingUsers()) {
              <pl-loading />
            } @else {
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
                            <span class="pl-avatar pl-avatar--sm">{{ initialsOf(user.name) }}</span>
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
            }
          </div>
        }

        @if (tab() === 'skills') {
          <div class="row g-4">
            <div class="col-12 col-lg-5">
              <div class="pl-panel">
                <p class="pl-label mb-3">Add a skill to the catalog</p>
                <form (ngSubmit)="createSkill()" novalidate>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="sk-name">Name</label>
                    <input
                      id="sk-name"
                      type="text"
                      class="pl-input"
                      required
                      maxlength="80"
                      [(ngModel)]="skillName"
                      name="skillName"
                      placeholder="e.g. motion design"
                    />
                  </div>
                  <div class="pl-field">
                    <label class="pl-label-inline" for="sk-desc">Description</label>
                    <textarea
                      id="sk-desc"
                      class="pl-textarea"
                      maxlength="500"
                      [(ngModel)]="skillDescription"
                      name="skillDescription"
                      rows="3"
                      placeholder="Optional — a short explanation of the skill."
                    ></textarea>
                  </div>
                  @if (skillError(); as message) {
                    <div class="pl-message mb-3" style="color: var(--pl-burgundy)" role="alert">
                      {{ message }}
                    </div>
                  }
                  <button
                    type="submit"
                    class="pl-btn pl-btn--accent"
                    [disabled]="creatingSkill()"
                  >
                    {{ creatingSkill() ? 'Adding…' : 'Add skill' }}
                  </button>
                </form>
              </div>
            </div>

            <div class="col-12 col-lg-7">
              <div class="pl-panel">
                <p class="pl-label mb-3">Catalog ({{ skills().length }})</p>
                @if (skills().length === 0) {
                  <p class="pl-muted mb-0">No skills in the catalog yet.</p>
                } @else {
                  <div class="d-flex flex-wrap gap-2">
                    @for (skill of skills(); track skill._id) {
                      <span class="pl-tag" [title]="skill.description">
                        {{ skill.name }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class AdminWorkspace {
  private readonly userService = inject(UserService);
  private readonly skillService = inject(SkillService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly tab = signal<'users' | 'skills'>('users');

  protected readonly loadingUsers = signal(true);
  protected readonly users = signal<User[]>([]);
  protected readonly pagination = signal<NonNullable<UserListData>['pagination'] | null>(null);

  protected readonly skills = signal<Skill[]>([]);
  protected readonly skillName = signal('');
  protected readonly skillDescription = signal('');
  protected readonly creatingSkill = signal(false);
  protected readonly skillError = signal('');

  protected readonly myId = signal('');

  protected readonly formatDate = formatDate;
  protected readonly initialsOf = initialsOf;
  protected readonly roleDisplay = roleDisplay;

  constructor() {
    this.myId.set(this.auth.user()?._id ?? '');
    this.loadUsers(1);
    this.skillService.getSkills().subscribe({
      next: (skills) => this.skills.set(skills),
      error: () => void 0,
    });
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
        body: 'Their profile, projects, proposals, contracts, services and messages will all be removed.',
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

  createSkill(): void {
    const name = this.skillName().trim();
    if (!name) {
      this.skillError.set('A skill name is required.');
      return;
    }
    this.creatingSkill.set(true);
    this.skillError.set('');
    this.skillService
      .createSkill({ name, description: this.skillDescription().trim() })
      .subscribe({
        next: (skill) => {
          this.toast.success(`Skill "${skill.name}" added.`);
          this.skillName.set('');
          this.skillDescription.set('');
          this.skills.update((items) =>
            [...items, skill].sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.creatingSkill.set(false);
        },
        error: (err) => {
          this.skillError.set(extractApiMessage(err, 'Unable to add the skill.'));
          this.creatingSkill.set(false);
        },
      });
  }
}