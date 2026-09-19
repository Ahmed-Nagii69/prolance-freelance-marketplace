import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { ServiceService } from '../../core/services/resource.services';
import { AuthService } from '../../core/services/auth.service';
import { SkillService } from '../../core/services/resource.services';
import { Project, Service, Skill, User } from '../../core/models/models';
import { formatCurrency } from '../../core/utils/format';
import { StatusBadge } from '../../shared/components/status-badge/status-badge.component';
import { SkillTags } from '../../shared/components/skill-tags/skill-tags.component';
import { LoadingBlock } from '../../shared/components/loading/loading.component';
import { EmptyState } from '../../shared/components/empty-state/empty-state.component';

interface NextStep {
  step: string;
  title: string;
  detail: string;
  link: (string | number)[];
}

@Component({
  selector: 'pl-home',
  standalone: true,
  imports: [RouterLink, StatusBadge, SkillTags, LoadingBlock, EmptyState],
  template: `
    <section class="pl-hero">
      <div class="pl-container">
        <div class="row align-items-end g-5">
          <div class="col-12 col-lg-7">
            <p class="pl-kicker pl-kicker--accent">A freelance marketplace</p>
            <h1 class="pl-headline pl-headline--lg">
              Good work happens when the brief is clear.
            </h1>
            <p class="pl-lede">
              ProLance brings clients and independent professionals together —
              structured projects, considered proposals, and contracts that
              keep the work moving.
            </p>
            <div class="pl-hero__cta">
              @if (user(); as currentUser) {
                @if (currentUser.role === 'CLIENT') {
                  <a routerLink="/projects/new" class="pl-btn pl-btn--dark">
                    Post a project
                  </a>
                  <a routerLink="/projects" class="pl-btn pl-btn--outline">
                    Browse projects
                  </a>
                } @else if (currentUser.role === 'FREELANCER') {
                  <a routerLink="/projects" class="pl-btn pl-btn--dark">
                    Find work
                  </a>
                  <a routerLink="/profile/freelancer" class="pl-btn pl-btn--outline">
                    Set up your profile
                  </a>
                } @else {
                  <a routerLink="/admin" class="pl-btn pl-btn--dark">
                    Open admin workspace
                  </a>
                }
              } @else {
                <a routerLink="/projects" class="pl-btn pl-btn--dark">
                  Browse projects
                </a>
                <a routerLink="/auth/register" class="pl-btn pl-btn--accent">
                  Join ProLance
                </a>
              }
            </div>

            <div class="pl-hero__meta">
              <span class="pl-faint">Open briefs live now</span>
              <span class="pl-faint">·</span>
              <span class="pl-faint">Verified reviews after completion</span>
            </div>
          </div>
          <div class="col-12 col-lg-5">
            @if (projectsLoading()) {
              <div class="pl-panel"><span class="pl-faint">Loading briefs…</span></div>
            } @else {
              <div class="d-flex flex-column gap-3">
                @for (project of featured(); track project._id) {
                  <a
                    [routerLink]="['/projects', project._id]"
                    class="pl-card pl-card--hover"
                    style="text-decoration: none"
                  >
                    <div class="d-flex justify-content-between gap-3">
                      <span class="pl-card__title">{{ project.title }}</span>
                      <pl-status-badge [status]="project.status" />
                    </div>
                    <div class="pl-card__meta">
                      {{ formatCurrency(project.budget) }}
                      @if (clientName(project); as name) {
                        · {{ name }}
                      }
                    </div>
                    <div class="mb-3">
                      <pl-skill-tags [skills]="project.skills.slice(0, 3)" />
                    </div>
                  </a>
                }
                @if (featured().length === 0) {
                  <div class="pl-panel text-center">
                    <p class="pl-h3">No open projects right now.</p>
                    <a routerLink="/projects" class="pl-faded-link">View all projects →</a>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    @if (user()) {
      <section class="pl-section" style="padding-bottom: 0">
        <div class="pl-container">
          <div
            class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4"
          >
            <div>
              <p class="pl-kicker">Where to start</p>
              <h2 class="pl-headline mb-0">Your path on ProLance</h2>
            </div>
          </div>
          <div class="row g-4">
            @for (step of steps(); track step.step) {
              <div class="col-12 col-md-6 col-lg-3">
                <a
                  [routerLink]="step.link"
                  class="pl-card pl-card--hover h-100"
                  style="text-decoration: none"
                >
                  <p class="pl-h2 m-0" style="color: var(--pl-brass)">
                    {{ step.step }}
                  </p>
                  <p class="pl-card__title">{{ step.title }}</p>
                  <p class="pl-card__meta mb-0">{{ step.detail }}</p>
                  <span class="pl-faded-link">Start →</span>
                </a>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <section class="pl-section pl-section--tint">
      <div class="pl-container">
        <div class="row g-5">
          <div class="col-12 col-lg-4">
            <p class="pl-kicker" style="color: var(--pl-brass)">How it works</p>
            <h2 class="pl-headline pl-headline--inverse">
              A clear path from brief to delivery.
            </h2>
            <p class="pl-lede pl-lede--inverse mb-0">
              No noise, no auction chaos. Every step is deliberate and
              documented.
            </p>
          </div>
          <div class="col-12 col-lg-8">
            <div class="row g-4">
              <div class="col-12 col-md-4">
                <div class="pl-feature">
                  <p class="pl-h2 m-0" style="color: var(--pl-brass)">01</p>
                  <p class="pl-feature__title text-white">Post a clear brief</p>
                  <p class="pl-feature__body" style="color: rgba(245,241,232,.7)">
                    Clients write a project with budget, deadline and required
                    skills.
                  </p>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="pl-feature">
                  <p class="pl-h2 m-0" style="color: var(--pl-brass)">02</p>
                  <p class="pl-feature__title text-white">Freelancers propose</p>
                  <p class="pl-feature__body" style="color: rgba(245,241,232,.7)">
                    Independent professionals respond with a price, timeline
                    and cover letter.
                  </p>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="pl-feature">
                  <p class="pl-h2 m-0" style="color: var(--pl-brass)">03</p>
                  <p class="pl-feature__title text-white">Contract, then review</p>
                  <p class="pl-feature__body" style="color: rgba(245,241,232,.7)">
                    Accept a proposal, message within the project, and leave a
                    verified review when it's done.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="pl-section pl-section--tint-light">
      <div class="pl-container">
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
          <div>
            <p class="pl-kicker">The catalogue</p>
            <h2 class="pl-h2">Skills across the platform</h2>
          </div>
          <a routerLink="/skills" class="pl-faded-link">Full skill list →</a>
        </div>
        @if (skills().length === 0) {
          <pl-loading />
        } @else {
          <div class="d-flex flex-wrap gap-2">
            @for (skill of skills().slice(0, 12); track skill._id) {
              <span class="pl-tag pl-tag--active">
                <a
                  [routerLink]="['/projects']"
                  [queryParams]="{ skill: skill.name }"
                  style="color: inherit"
                  >{{ skill.name }}</a
                >
              </span>
            }
          </div>
        }
      </div>
    </section>

    <section class="pl-section">
      <div class="pl-container">
        <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
          <div>
            <p class="pl-kicker">Services</p>
            <h2 class="pl-h2">Pre-packed offerings</h2>
          </div>
          <a routerLink="/services" class="pl-faded-link">All services →</a>
        </div>
        @if (servicesLoading()) {
          <pl-loading />
        } @else if (services().length === 0) {
          <pl-empty-state
            title="No services yet"
            body="Freelancers can publish fixed-price offerings that clients can discover directly."
          />
        } @else {
          <div class="row g-4">
            @for (service of services(); track service._id) {
              <div class="col-12 col-md-6 col-lg-4">
                <div class="pl-card">
                  <div class="d-flex justify-content-between align-items-start gap-3">
                    <span class="pl-card__title">{{ service.title }}</span>
                    <span class="pl-h3 m-0" style="color: var(--pl-petrol)">
                      {{ formatCurrency(service.price) }}
                    </span>
                  </div>
                  <p class="pl-card__meta">
                    by {{ service.freelancer?.name ?? 'A freelancer' }}
                  </p>
                  <p class="pl-card__body" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden">
                    {{ service.description }}
                  </p>
                  <div class="mt-auto">
                    <pl-skill-tags [skillsObjects]="service.skills ?? []" />
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <section class="pl-section" style="padding-top: 0">
      <div class="pl-container">
        <div
          class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-4"
          style="
            background-color: var(--pl-paper);
            border: 1px solid var(--pl-line);
            border-left: 4px solid var(--pl-brass);
            border-radius: var(--pl-radius-lg);
            padding: 2rem;
          "
        >
          <div>
            <p class="pl-kicker">Ready when you are</p>
            <h2 class="pl-h2 mb-1">Post your project or set up your profile.</h2>
            <p class="pl-muted mb-0" style="font-size: 0.95rem">
              The marketplace works for both sides of the table.
            </p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <a routerLink="/projects/new" class="pl-btn pl-btn--dark">Post a project</a>
            <a routerLink="/auth/register" class="pl-btn pl-btn--outline">
              Create an account
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  private readonly projectService = inject(ProjectService);
  private readonly serviceService = inject(ServiceService);
  private readonly skillService = inject(SkillService);
  private readonly auth = inject(AuthService);

  protected readonly user = computed<User | null>(() => this.auth.user());
  protected readonly formatCurrency = formatCurrency;

  protected readonly steps = computed<NextStep[]>(() => {
    switch (this.user()?.role) {
      case 'CLIENT':
        return [
          {
            step: '01',
            title: 'Post a clear brief',
            detail: 'Scope, budget, deadline and required skills.',
            link: ['/projects/new'],
          },
          {
            step: '02',
            title: 'Review proposals',
            detail: 'Shortlist the freelancer that fits best.',
            link: ['/projects/my'],
          },
          {
            step: '03',
            title: 'Start a contract',
            detail: 'Accept a proposal and begin the work.',
            link: ['/contracts'],
          },
          {
            step: '04',
            title: 'Message & finish',
            detail: 'Chat during the work, then complete and review.',
            link: ['/messages'],
          },
        ];
      case 'FREELANCER':
        return [
          {
            step: '01',
            title: 'Complete your profile',
            detail: 'Title, bio, hourly rate and skills.',
            link: ['/profile/freelancer'],
          },
          {
            step: '02',
            title: 'Find open work',
            detail: 'Browse briefs and filter by your skills.',
            link: ['/projects'],
          },
          {
            step: '03',
            title: 'Submit proposals',
            detail: 'Price, timeline and a cover letter.',
            link: ['/proposals/my'],
          },
          {
            step: '04',
            title: 'Deliver & get reviewed',
            detail: 'Manage contracts and earn verified reviews.',
            link: ['/contracts'],
          },
        ];
      case 'ADMIN':
        return [
          {
            step: '01',
            title: 'Open the admin workspace',
            detail: 'Manage users and the skill catalog.',
            link: ['/admin'],
          },
        ];
      default:
        return [];
    }
  });

  protected readonly projectsLoading = signal(true);
  protected readonly featured = signal<Project[]>([]);
  protected readonly servicesLoading = signal(true);
  protected readonly services = signal<Service[]>([]);
  protected readonly skills = signal<Skill[]>([]);

  constructor() {
    this.projectService
      .getProjects({ status: 'OPEN', sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 3 })
      .subscribe({
        next: (data) => this.featured.set(data.projects),
        error: () => void 0,
      })
      .add(() => this.projectsLoading.set(false));

    this.serviceService.getServices().subscribe({
      next: (data) => this.services.set(data.slice(0, 3)),
      error: () => void 0,
    }).add(() => this.servicesLoading.set(false));

    this.skillService.getSkills().subscribe({
      next: (data) => this.skills.set(data),
      error: () => void 0,
    });
  }

  clientName(project: Project): string {
    if (typeof project.client === 'object' && project.client !== null) {
      return project.client.name;
    }
    return '';
  }
}