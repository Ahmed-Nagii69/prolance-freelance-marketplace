import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/models';
import { formatCurrency, deadlineLabel } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'pl-my-projects',
  standalone: true,
  imports: [RouterLink, StatusBadge, EmptyState, LoadingBlock,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Client workspace</p>
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
          <h1 class="pl-headline mb-0">My projects</h1>
          <a routerLink="/projects/new" class="pl-btn pl-btn--dark">
            Post a project
          </a>
        </div>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (projects().length === 0) {
          <pl-empty-state
            title="No projects yet"
            body="Post your first brief and start receiving proposals from freelance professionals."
          >
            <a routerLink="/projects/new" class="pl-btn pl-btn--accent pl-btn--sm" pl-empty-action>
              Post a project
            </a>
          </pl-empty-state>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (project of projects(); track project._id) {
              <div class="pl-card">
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div>
                    <a
                      [routerLink]="['/projects', project._id]"
                      class="pl-card__title"
                      style="display: inline-block"
                      >{{ project.title }}</a
                    >
                    <div class="pl-card__meta">
                      {{ formatCurrency(project.budget) }} ·
                      {{ deadlineLabel(project.deadline) }}
                    </div>
                  </div>
                  <pl-status-badge [status]="project.status" />
                </div>
                <div class="pl-card__foot mt-3">
                  @if (project.status === 'OPEN' || project.status === 'IN_PROGRESS') {
                    <a
                      [routerLink]="['/projects', project._id, 'proposals']"
                      class="pl-btn pl-btn--outline pl-btn--sm"
                      >View proposals</a
                    >
                  }
                  <a
                    [routerLink]="['/projects', project._id, 'edit']"
                    class="pl-btn pl-btn--ghost pl-btn--sm"
                    >Edit</a
                  >
                  <a
                    [routerLink]="['/messages/project', project._id]"
                    class="pl-btn pl-btn--ghost pl-btn--sm"
                    >Messages</a
                  >
                  <a
                    [routerLink]="['/projects', project._id]"
                    class="pl-faded-link ms-auto"
                    >View brief →</a
                  >
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class MyProjects {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly projects = signal<Project[]>([]);
  protected readonly formatCurrency = formatCurrency;
  protected readonly deadlineLabel = deadlineLabel;

  constructor() {
    this.projectService.getMyProjects().subscribe({
      next: (data) => this.projects.set(data),
      error: () => void 0,
    }).add(() => this.loading.set(false));
  }
}