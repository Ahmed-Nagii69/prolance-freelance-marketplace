import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectListData, ProjectQuery } from '../../../core/models/models';
import { formatCurrency } from '../../../core/utils/format';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge.component';
import { SkillTags } from '../../../shared/components/skill-tags/skill-tags.component';
import { PaginationControls } from '../../../shared/components/pagination/pagination.component';
import { EmptyState } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-projects-browse',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    StatusBadge,
    SkillTags,
    PaginationControls,
    EmptyState, LoadingBlock,],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Project marketplace</p>
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
          <h1 class="pl-headline mb-0">Browse projects</h1>
          <a routerLink="/projects/new" class="pl-btn pl-btn--dark">Post a project</a>
        </div>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        <form class="pl-filters mb-4" (ngSubmit)="applyFilters()" novalidate>
          <div class="flex-grow-1" style="min-width: 220px">
            <label class="pl-label-inline" for="f-search">Search</label>
            <input
              id="f-search"
              type="search"
              class="pl-input"
              [(ngModel)]="filters().search"
              name="search"
              placeholder="Titles and descriptions"
            />
          </div>
          <div style="min-width: 170px">
            <label class="pl-label-inline" for="f-status">Status</label>
            <select
              id="f-status"
              class="pl-select"
              [(ngModel)]="filters().status"
              name="status"
            >
              <option value="">Any status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div style="min-width: 170px">
            <label class="pl-label-inline" for="f-skill">Skill</label>
            <input
              id="f-skill"
              type="text"
              class="pl-input"
              [(ngModel)]="filters().skill"
              name="skill"
              placeholder="e.g. typescript"
            />
          </div>
          <div style="min-width: 150px">
            <label class="pl-label-inline" for="f-min">Min budget</label>
            <input
              id="f-min"
              type="number"
              min="0"
              class="pl-input"
              [(ngModel)]="filters().minBudget"
              name="minBudget"
              placeholder="0"
            />
          </div>
          <div style="min-width: 150px">
            <label class="pl-label-inline" for="f-max">Max budget</label>
            <input
              id="f-max"
              type="number"
              min="0"
              class="pl-input"
              [(ngModel)]="filters().maxBudget"
              name="maxBudget"
              placeholder="∞"
            />
          </div>
          <div style="min-width: 150px">
            <label class="pl-label-inline" for="f-sort">Sort by</label>
            <select
              id="f-sort"
              class="pl-select"
              [(ngModel)]="filters().sortBy"
              name="sortBy"
            >
              <option value="createdAt">Newest first</option>
              <option value="budget">Budget</option>
              <option value="durationDays">Duration</option>
              <option value="title">Title</option>
            </select>
          </div>
          <div class="d-flex gap-2">
            <button type="submit" class="pl-btn pl-btn--accent">Apply</button>
            <button
              type="button"
              class="pl-btn pl-btn--outline"
              (click)="resetFilters()"
            >
              Reset
            </button>
          </div>
        </form>

        @if (loading()) {
          <pl-loading />
        } @else if (projects().length === 0) {
          <pl-empty-state
            title="No projects match"
            body="Try widening the filters, or reset them to see everything on the marketplace."
          >
            <button
              type="button"
              class="pl-btn pl-btn--outline pl-btn--sm"
              (click)="resetFilters()"
              pl-empty-action
            >
              Reset filters
            </button>
          </pl-empty-state>
        } @else {
          <div class="d-flex flex-column gap-3">
            @for (project of projects(); track project._id) {
              <a
                [routerLink]="['/projects', project._id]"
                class="pl-card pl-card--hover"
                style="text-decoration: none"
              >
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                  <div style="flex: 1 1 auto; min-width: 0">
                    <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                      <span class="pl-card__title">{{ project.title }}</span>
                      <pl-status-badge [status]="project.status" />
                    </div>
                    <p class="pl-card__meta">
                      Posted {{ createdAtLabel(project.createdAt) }}
                      @if (isClient(project.client); as client) {
                        · by {{ client.name }}
                      }
                    </p>
                    <p class="pl-card__body" style="margin-bottom: 0.8rem">
                      {{ truncated(project.description) }}
                    </p>
                  </div>
                  <div
                    class="d-flex flex-row flex-md-column justify-content-between gap-3"
                    style="min-width: 190px"
                  >
                    <div class="pl-stat">
                      <span class="pl-stat__value">{{ formatCurrency(project.budget) }}</span>
                      <span class="pl-stat__label">Budget</span>
                    </div>
                    <div class="pl-stat" style="border-left-color: var(--pl-purple)">
                      <span class="pl-stat__value" style="font-size: 1.4rem">
                        {{ project.durationDays }} days
                      </span>
                      <span class="pl-stat__label">Duration</span>
                    </div>
                  </div>
                </div>
                <div class="pl-card__foot">
                  <pl-skill-tags [skills]="project.skills" />
                  <span class="pl-faded-link ms-auto"
                    >View project
                    <span aria-hidden="true">→</span></span
                  >
                </div>
              </a>
            }
          </div>

          @if (pagination(); as pagination) {
            <div class="mt-4">
              <pl-pagination [data]="pagination" (pageChange)="goToPage($event)" />
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class ProjectsBrowse {
  private readonly projectService = inject(ProjectService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly projects = signal<ProjectListData['projects']>([]);
  protected readonly pagination = signal<ProjectListData['pagination'] | null>(
    null,
  );

  protected readonly filters = signal<ProjectQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  protected readonly formatCurrency = formatCurrency;

  constructor() {
    const initialSkill = this.route.snapshot.queryParamMap.get('skill');
    if (initialSkill) {
      this.filters.update((value) => ({ ...value, skill: initialSkill }));
    }

    this.fetch();
  }

  fetch(): void {
    const query = this.filters();
    this.loading.set(true);
    this.projectService.getProjects(query).subscribe({
      next: (data) => {
        this.projects.set(data.projects);
        this.pagination.set(data.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.filters.update((value) => ({ ...value, page: 1 }));
    this.fetch();
  }

  resetFilters(): void {
    this.filters.set({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
    this.fetch();
  }

  goToPage(page: number): void {
    this.filters.update((value) => ({ ...value, page }));
    this.fetch();
  }

  truncated(description: string): string {
    return description.length > 220
      ? `${description.slice(0, 220)}…`
      : description;
  }

  createdAtLabel(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  isClient(value: unknown): { name: string } | null {
    if (typeof value === 'object' && value !== null && 'name' in value) {
      return value as { name: string };
    }
    return null;
  }
}