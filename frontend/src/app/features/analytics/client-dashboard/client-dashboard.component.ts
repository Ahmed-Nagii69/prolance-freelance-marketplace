import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClientAnalyticsData } from '../../../core/models/models';
import { formatCurrency } from '../../../core/utils/format';
import { extractApiMessage } from '../../../core/utils/http-error';
import { KpiGrid, KpiCard } from '../../../shared/components/kpi-grid/kpi-grid.component';
import { StatusChart } from '../../../shared/components/status-chart/status-chart.component';
import { MoneyChart } from '../../../shared/components/money-chart/money-chart.component';
import { ActivityFeed } from '../../../shared/components/activity-feed/activity-feed.component';
import { LoadingBlock } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'pl-client-dashboard',
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
        <p class="pl-kicker">Client workspace</p>
        <h1 class="pl-headline mb-0">{{ greeting() }}, {{ name() }}</h1>
        <p class="pl-muted mt-2 mb-0" style="max-width: 58ch">
          A summary of your projects, incoming proposals and spending.
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
              title="Projects by status"
              [items]="projectStatus()"
              emptyText="No projects yet"
            />
            <pl-status-chart
              title="Proposals received"
              [items]="proposalStatus()"
              emptyText="No proposals received yet"
            />
          </div>

          <div class="mb-4">
            <pl-money-chart
              title="Spending over time"
              note="Last 6 months"
              [series]="monthlySpending()"
              emptyText="No payments made yet"
            />
          </div>

          <div class="pl-panel">
            <div class="head">
              <h3 class="panel-title">Recent activity</h3>
              <a routerLink="/projects/my" class="pl-btn pl-btn--ghost pl-btn--sm">
                My projects
              </a>
            </div>
            <pl-activity-feed
              [entries]="recentActivity()"
              emptyBody="Your projects, proposals, contracts and payments will show up here as they happen."
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
export class ClientDashboard {
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private readonly data = signal<ClientAnalyticsData | null>(null);

  protected readonly name = computed(() => this.auth.user()?.name ?? 'there');
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly kpis = computed<KpiCard[]>(() => {
    const kpis = this.data()?.kpis;
    if (!kpis) return [];
    return [
      {
        icon: 'briefcase',
        label: 'Total projects',
        value: String(kpis.totalProjects),
        sub: `${kpis.activeProjects} active · ${kpis.completedProjects} completed`,
      },
      {
        icon: 'cash',
        label: 'Total spent',
        value: formatCurrency(kpis.totalSpent),
        sub: `${kpis.activeContracts} contract(s) still in progress`,
      },
      {
        icon: 'mailbox',
        label: 'Proposals received',
        value: String(kpis.totalProposals),
        sub: `${kpis.pendingProposals} pending · ${kpis.acceptedProposals} accepted`,
      },
      {
        icon: 'percentage',
        label: 'Selection rate',
        value: kpis.selectionRate === null ? '—' : `${kpis.selectionRate}%`,
        sub: `${kpis.acceptedProposals} of ${kpis.totalProposals} proposals hired`,
      },
      {
        icon: 'file-certificate',
        label: 'Active contracts',
        value: String(kpis.activeContracts),
        sub: `${kpis.completedContracts} completed · ${kpis.totalContracts} total`,
      },
      {
        icon: 'folder',
        label: 'Open projects',
        value: String(kpis.openProjects),
        sub: `${kpis.inProgressProjects} in progress · ${kpis.cancelledProjects} cancelled`,
      },
    ];
  });

  protected readonly projectStatus = computed(() => this.data()?.projectStatus ?? []);
  protected readonly proposalStatus = computed(() => this.data()?.proposalStatus ?? []);
  protected readonly monthlySpending = computed(() => this.data()?.monthlySpending ?? []);
  protected readonly recentActivity = computed(() => this.data()?.recentActivity ?? []);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.analytics.refreshClientAnalytics().subscribe({
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
