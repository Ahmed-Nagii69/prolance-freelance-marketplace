import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { Project, User } from '../../core/models/models';
import { formatCurrencyRange } from '../../core/utils/format';
import { StatusBadge } from '../../shared/components/status-badge/status-badge.component';
import { SkillTags } from '../../shared/components/skill-tags/skill-tags.component';
import { Spinner } from '../../shared/components/loading/loading.component';
import { Reveal } from '../../shared/directives/reveal.directive';

interface NextStep {
  step: string;
  title: string;
  detail: string;
  link: (string | number)[];
}

/**
 * A wireframe of one stage of the marketplace, used in the hero composition.
 * The detail lines name the real fields each stage collects (see the Project,
 * Proposal, Contract and Review models) rather than sample records, so the
 * composition illustrates the product without inventing content.
 */
interface StageFragment {
  key: string;
  index: string;
  label: string;
  detail: string;
  /** Parallax multiplier: higher values travel further with the pointer. */
  depth: number;
  /** Float animation timing, offset per fragment so they never move in lockstep. */
  duration: number;
  delay: number;
  tilt: string;
}

const STAGE_FRAGMENTS: StageFragment[] = [
  {
    key: 'brief',
    index: '01',
    label: 'Brief',
    detail: 'Title · budget · skills',
    depth: 26,
    duration: 11,
    delay: 0,
    tilt: 'rotateX(5deg) rotateY(-7deg)',
  },
  {
    key: 'proposal',
    index: '02',
    label: 'Proposal',
    detail: 'Price · timeline · cover letter',
    depth: 18,
    duration: 13,
    delay: -2.4,
    tilt: 'rotateX(3deg) rotateY(5deg)',
  },
  {
    key: 'contract',
    index: '03',
    label: 'Contract',
    detail: 'Escrow · status · delivery',
    depth: 10,
    duration: 15,
    delay: -5.1,
    tilt: 'rotateX(-2deg) rotateY(3deg)',
  },
  {
    key: 'delivery',
    index: '04',
    label: 'Delivery',
    detail: 'Submission · evidence',
    depth: 16,
    duration: 12,
    delay: -3.3,
    tilt: 'rotateX(2deg) rotateY(-5deg)',
  },
  {
    key: 'review',
    index: '05',
    label: 'Review',
    detail: 'Rating · verified comment',
    depth: 30,
    duration: 14,
    delay: -6.8,
    tilt: 'rotateX(-4deg) rotateY(-8deg)',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Post a clear brief',
    detail:
      'Clients write a project with budget, duration and the skills it needs, so proposals arrive against the same information.',
  },
  {
    step: '02',
    title: 'Freelancers propose',
    detail:
      'Independent professionals answer with a price, a timeline and a cover letter. You compare like with like.',
  },
  {
    step: '03',
    title: 'Contract, then review',
    detail:
      'Accept a proposal, start the contract, and leave a verified review once the work is delivered.',
  },
];

@Component({
  selector: 'pl-home',
  standalone: true,
  imports: [RouterLink, StatusBadge, SkillTags, Spinner, Reveal, TablerIconComponent],
  template: `
    <section class="pl-hero">
      <span class="pl-hero__grid" aria-hidden="true"></span>

      <div class="pl-container">
        <div class="row g-5 align-items-center">
          <div class="col-12 col-lg-6">
            <p class="pl-kicker pl-kicker--accent">A freelance marketplace</p>

            <h1 class="pl-headline pl-headline--lg pl-headline--inverse pl-hero__title">
              @for (word of titleWords; track $index) {
                <span
                  class="pl-hero__word"
                  [style.--i]="$index"
                  >{{ word }}{{ $index < titleWords.length - 1 ? ' ' : '' }}</span
                >
              }
            </h1>

            <p class="pl-lede pl-lede--inverse pl-hero__lede">
              ProLance brings clients and independent professionals together —
              structured projects, considered proposals, and contracts that keep
              the work moving.
            </p>

            <div class="pl-hero__cta">
              @if (user(); as currentUser) {
                @if (currentUser.role === 'CLIENT') {
                  <a routerLink="/projects/new" class="pl-btn pl-btn--accent">
                    Post a project
                  </a>
                  <a routerLink="/projects" class="pl-btn pl-btn--outline-inverse">
                    Browse projects
                  </a>
                } @else if (currentUser.role === 'FREELANCER') {
                  <a routerLink="/projects" class="pl-btn pl-btn--accent">
                    Find work
                  </a>
                  <a routerLink="/profile/freelancer" class="pl-btn pl-btn--outline-inverse">
                    Set up your profile
                  </a>
                } @else {
                  <a routerLink="/admin" class="pl-btn pl-btn--accent">
                    Open admin workspace
                  </a>
                }
              } @else {
                <a routerLink="/projects" class="pl-btn pl-btn--accent">
                  Browse projects
                </a>
                <a routerLink="/auth/register" class="pl-btn pl-btn--outline-inverse">
                  Join ProLance
                </a>
              }
            </div>

            <div class="pl-hero__meta">
              <span class="pl-hero__meta-link">Open briefs live now</span>
              <span class="pl-hero__meta-divider" aria-hidden="true"></span>
              <span class="pl-hero__meta-link">Verified reviews after completion</span>
            </div>
          </div>

          <div class="col-12 col-lg-6">
            <div class="pl-hero__stage" #stage aria-hidden="true">
              <div class="pl-stage__spine">
                <span class="pl-stage__run">
                  <span class="pl-stage__pulse"></span>
                </span>
              </div>

              @for (fragment of fragments; track fragment.key) {
                <div
                  [class]="'pl-stage__layer pl-stage__layer--' + fragment.key"
                  [style.--depth]="fragment.depth"
                  [style.--dur]="fragment.duration + 's'"
                  [style.--delay]="fragment.delay + 's'"
                >
                  <div class="pl-stage__float" [style.--tilt]="fragment.tilt">
                    <span class="pl-stage__index">{{ fragment.index }}</span>
                    <p class="pl-stage__label">{{ fragment.label }}</p>
                    <p class="pl-stage__detail">{{ fragment.detail }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <ol class="pl-hero__flow" aria-hidden="true">
          @for (fragment of fragments; track fragment.key) {
            <li>{{ fragment.label }}</li>
          }
        </ol>
      </div>
    </section>

    @if (user()) {
      <section class="pl-section pl-section--tight">
        <div class="pl-container">
          <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
            <div>
              <p class="pl-kicker">Where to start</p>
              <h2 class="pl-headline mb-0">Your path on ProLance</h2>
            </div>
          </div>
          <div class="row g-4">
            @for (step of steps(); track step.step; let i = $index) {
              <!--
                The reveal sits on the grid item rather than the anchor, because
                the card's own hover uses transform and the reveal uses transform
                too. Revealing the column keeps the two from overwriting each
                other.
              -->
              <div
                class="col-12 col-md-6 col-lg-3"
                plReveal
                [plRevealDelay]="i * 90"
              >
                <a
                  [routerLink]="step.link"
                  class="pl-step pl-card pl-card--hover h-100"
                >
                  <p class="pl-step__number mb-0">{{ step.step }}</p>
                  <p class="pl-step__title">{{ step.title }}</p>
                  <p class="pl-step__detail mb-0">{{ step.detail }}</p>
                  <span class="pl-step__cta">
                    Start
                    <tabler-icon icon="arrow-right" [size]="15" />
                  </span>
                </a>
              </div>
            }
          </div>
        </div>
      </section>
    }

    <section class="pl-section pl-section--tint-light">
      <div class="pl-container">
        <div class="pl-showcase__head" plReveal>
          <div>
            <p class="pl-kicker">Open projects</p>
            <h2 class="pl-headline mb-0">Briefs looking for a serious answer.</h2>
          </div>
          <a routerLink="/projects" class="pl-showcase__all">
            Browse all projects
            <tabler-icon icon="arrow-right" [size]="16" />
          </a>
        </div>

        @if (projectsLoading()) {
          <div class="pl-panel pl-hero__loading">
            <pl-spinner />
            <span class="pl-faint">Loading briefs…</span>
          </div>
        } @else if (featured().length === 0) {
          <div class="pl-panel text-center">
            <p class="pl-h3">No open projects right now.</p>
            <a routerLink="/projects" class="pl-faded-link">View all projects →</a>
          </div>
        } @else {
          <div class="pl-showcase">
            @for (project of featured(); track project._id; let i = $index) {
              <a
                [routerLink]="['/projects', project._id]"
                class="pl-entry"
                plReveal
                [plRevealDelay]="i * 110"
              >
                <span class="pl-entry__rule" aria-hidden="true"></span>

                <div class="pl-entry__main">
                  <div class="pl-entry__top">
                    <h3 class="pl-entry__title">{{ project.title }}</h3>
                    <pl-status-badge [status]="project.status" />
                  </div>

                  <p class="pl-entry__excerpt">{{ excerpt(project.description) }}</p>

                  <div class="pl-entry__tags">
                    <pl-skill-tags [skills]="project.skills.slice(0, 4)" />
                  </div>
                </div>

                <div class="pl-entry__aside">
                  <p class="pl-entry__budget">
                    {{ formatCurrencyRange(project.minBudget, project.maxBudget) }}
                  </p>
                  <dl class="pl-entry__facts">
                    <div>
                      <dt>Proposals</dt>
                      <dd>{{ proposalCount(project) }}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{{ project.durationDays }} days</dd>
                    </div>
                    @if (clientName(project); as name) {
                      <div>
                        <dt>Client</dt>
                        <dd>{{ name }}</dd>
                      </div>
                    }
                  </dl>
                  <span class="pl-entry__go" aria-hidden="true">
                    <tabler-icon icon="arrow-right" [size]="18" />
                  </span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <section class="pl-section pl-section--tint">
      <div class="pl-container">
        <div class="row g-5 align-items-start">
          <div class="col-12 col-lg-4">
            <div plReveal>
              <p class="pl-kicker" style="color: var(--pl-brass)">How it works</p>
              <h2 class="pl-headline pl-headline--inverse">
                A clear path from brief to delivery.
              </h2>
              <p class="pl-lede pl-lede--inverse mb-0">
                No noise, no auction chaos. Every step is deliberate and
                documented.
              </p>
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <ol class="pl-journey">
              @for (item of howItWorks; track item.step; let i = $index) {
                <li class="pl-journey__step" plReveal [plRevealDelay]="i * 130">
                  <span class="pl-journey__num">{{ item.step }}</span>
                  <div>
                    <h3 class="pl-journey__title">{{ item.title }}</h3>
                    <p class="pl-journey__body">{{ item.detail }}</p>
                  </div>
                </li>
              }
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="pl-closing">
      <div class="pl-container">
        <div class="pl-closing__head" plReveal>
          <p class="pl-kicker pl-kicker--accent">Ready when you are</p>
          <h2 class="pl-headline pl-headline--inverse mb-0">
            One marketplace, two ways in.
          </h2>
        </div>

        <div class="row g-4 pl-closing__grid">
          <div class="col-12 col-lg-6" plReveal [plRevealDelay]="0">
            <div class="pl-closing__card h-100">
              <p class="pl-closing__audience">For clients</p>
              <h3 class="pl-h2">Post a project</h3>
              <p class="pl-closing__body">
                Write the brief, choose the proposal that fits, and keep the
                payment held until the work is done.
              </p>
              <a
                [routerLink]="clientCta().link"
                class="pl-btn pl-btn--accent"
              >
                {{ clientCta().label }}
              </a>
            </div>
          </div>

          <div class="col-12 col-lg-6" plReveal [plRevealDelay]="120">
            <div class="pl-closing__card h-100">
              <p class="pl-closing__audience">For freelancers</p>
              <h3 class="pl-h2">Create your profile</h3>
              <p class="pl-closing__body">
                Set your rate and skills, then answer the briefs that actually
                match what you do.
              </p>
              <a
                [routerLink]="freelancerCta().link"
                class="pl-btn pl-btn--outline-inverse"
              >
                {{ freelancerCta().label }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly user = computed<User | null>(() => this.auth.user());
  protected readonly formatCurrencyRange = formatCurrencyRange;
  protected readonly fragments = STAGE_FRAGMENTS;
  protected readonly howItWorks = HOW_IT_WORKS;
  protected readonly titleWords = 'Good work happens when the brief is clear.'.split(' ');

  protected readonly clientCta = computed(() => {
    const currentUser = this.user();
    if (currentUser?.role === 'CLIENT') {
      return { link: ['/projects/new'], label: 'Post a project' };
    }
    if (currentUser?.role === 'ADMIN') {
      return { link: ['/admin'], label: 'Open admin workspace' };
    }
    return { link: ['/auth/register'], label: 'Create an account' };
  });

  protected readonly freelancerCta = computed(() => {
    const currentUser = this.user();
    if (currentUser?.role === 'FREELANCER') {
      return { link: ['/profile/freelancer'], label: 'Create your profile' };
    }
    return { link: ['/auth/register'], label: 'Create an account' };
  });

  protected readonly steps = computed<NextStep[]>(() => {
    switch (this.user()?.role) {
      case 'CLIENT':
        return [
          {
            step: '01',
            title: 'Post a clear brief',
            detail: 'Scope, budget, duration and required skills.',
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
            title: 'Complete & review',
            detail: 'Finish the contract and exchange verified reviews.',
            link: ['/contracts'],
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
            detail: 'Manage the marketplace and its users.',
            link: ['/admin'],
          },
        ];
      default:
        return [];
    }
  });

  protected readonly projectsLoading = signal(true);
  protected readonly featured = signal<Project[]>([]);

  constructor() {
    this.projectService
      .getProjects({ status: 'OPEN', sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 3 })
      .subscribe({
        next: (data) => this.featured.set(data.projects),
        error: () => void 0,
      })
      .add(() => this.projectsLoading.set(false));

    afterNextRender(() => this.attachParallax());
  }

  /**
   * Feeds normalised pointer position to the hero composition as two custom
   * properties, which the stylesheet turns into per-layer movement. The stage
   * itself stays still; only its layers are offset, so the parallax costs two
   * style writes per frame and never reads layout.
   *
   * Pointer position is taken from the viewport rather than the element's box,
   * so no getBoundingClientRect runs on move and the effect does not need
   * invalidating as the page scrolls.
   */
  private attachParallax(): void {
    const stage = this.stage()?.nativeElement;
    if (!stage) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = !window.matchMedia('(pointer: fine)').matches;
    if (reducedMotion || coarsePointer || window.innerWidth < 992) {
      return;
    }

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame !== 0) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        stage.style.setProperty('--pl-px', x.toFixed(3));
        stage.style.setProperty('--pl-py', y.toFixed(3));
      });
    };

    const onLeave = () => {
      stage.style.setProperty('--pl-px', '0');
      stage.style.setProperty('--pl-py', '0');
    };

    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeave);

    this.destroyRef.onDestroy(() => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    });
  }

  clientName(project: Project): string {
    if (typeof project.client === 'object' && project.client !== null) {
      return project.client.name;
    }
    return '';
  }

  /** Keeps the curated rows to a scannable length without clipping mid-word. */
  excerpt(description: string, max = 190): string {
    const clean = description.trim().replace(/\s+/g, ' ');
    if (clean.length <= max) {
      return clean;
    }
    const cut = clean.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
  }

  /** The listing sends this for every project, so a card never has to guess. */
  proposalCount(project: Project): number {
    return project.proposalCount ?? 0;
  }
}
