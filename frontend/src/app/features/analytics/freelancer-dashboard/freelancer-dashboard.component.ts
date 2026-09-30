import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';
import { FreelancerAnalyticsData } from '../../../core/models/models';
import { extractApiMessage } from '../../../core/utils/http-error';
import { KpiGrid, KpiCard } from '../../../shared/components/kpi-grid/kpi-grid.component';
import { StatusChart } from '../../../shared/components/status-chart/status-chart.component';
import { MoneyChart } from '../../../shared/components/money-chart/money-chart.component';
import { ActivityFeed } from '../../../shared/components/activity-feed/activity-feed.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-freelancer-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    KpiGrid,
    StatusChart,
    MoneyChart,
    ActivityFeed,
    LoadingBlock,
  ],
  template: `
    <div class="pl-page-title">
      <div class="pl-container">
        <p class="pl-kicker">Freelancer workspace</p>
        <h1 class="pl-headline mb-0">{{ greeting() }}, {{ name() }}</h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 58ch">
          Your own activity summary: proposals, contracts, earnings and reviews.
        </p>
      </div>
    </div>

    <section class="pl-section pl-section--tight">
      <div class="pl-container">
        @if (loading()) {
          <pl-loading />
        } @else if (error()) {
          <div class="pl-empty">
            <p class="pl-empty__title">Analytics unavailable</p>
            <p class="pl-empty__body">{{ error() }}</p>
            <button type="button" class="pl-btn pl-btn--accent" (click)="load()">
              Try again
            </button>
          </div>
        } @else {
          <pl-kpi-grid [kpis]="kpis()" />

          <div class="charts-row">
            <pl-status-chart
              title="Proposals by status"
              [items]="proposalStatus()"
              emptyText="No proposals sent yet"
            />
            <pl-status-chart
              title="Contracts by status"
              [items]="contractStatus()"
              emptyText="No contracts yet"
            />
          </div>

          <div class="mb-4">
            <pl-money-chart
              title="Earnings over time"
              note="Last 6 months"
              [series]="monthlyEarnings()"
              emptyText="No payments received yet"
            />
          </div>

          <div class="pl-panel">
            <div class="head">
              <h3 class="panel-title">Recent activity</h3>
              <a routerLink="/proposals/my" class="pl-btn pl-btn--ghost pl-btn--sm">
                All proposals
              </a>
            </div>
            <pl-activity-feed
              [entries]="recentActivity()"
              emptyBody="Your proposals, contracts, payments and reviews will show up here as they happen."
            />
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .charts-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 991.98px) {
        .charts-row {
          grid-template-columns: 1fr;
        }
      }

      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.15rem;
      }

      .panel-title {
        font-family: var(--pl-font-display);
        font-size: 1.2rem;
        margin: 0;
      }
    `,
  ],
})
export class FreelancerDashboard {
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private readonly data = signal<FreelancerAnalyticsData | null>(null);

  protected readonly name = computed(() => this.auth.user()?.name ?? 'there');
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  // Only metrics that no chart already shows: proposal counts, contract counts
  // and earnings live in the status and monthly charts below.
  protected readonly kpis = computed<KpiCard[]>(() => {
    const kpis = this.data()?.kpis;
    if (!kpis) return [];
    return [
      {
        icon: 'percentage',
        label: 'Acceptance rate',
        value: kpis.acceptanceRate === null ? '—' : `${kpis.acceptanceRate}%`,
        sub: `${kpis.acceptedProposals} of ${kpis.totalProposals} proposals won`,
      },
      {
        icon: 'star',
        label: 'Average rating',
        value: kpis.totalReviews > 0 ? kpis.avgRating.toFixed(1) : '—',
        sub: `${kpis.totalReviews} review(s) received`,
      },
      {
        icon: 'progress-check',
        label: 'Profile completion',
        value: `${kpis.profileCompletion}%`,
        sub: `${kpis.portfolioItems} portfolio item(s) published`,
      },
    ];
  });

  protected readonly proposalStatus = computed(() => this.data()?.proposalStatus ?? []);
  protected readonly contractStatus = computed(() => this.data()?.contractStatus ?? []);
  protected readonly monthlyEarnings = computed(() => this.data()?.monthlyEarnings ?? []);
  protected readonly recentActivity = computed(() => this.data()?.recentActivity ?? []);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.analytics.refreshFreelancerAnalytics().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          extractApiMessage(err, 'We could not load your analytics right now.'),
        );
        this.loading.set(false);
      },
    });
  }
}
