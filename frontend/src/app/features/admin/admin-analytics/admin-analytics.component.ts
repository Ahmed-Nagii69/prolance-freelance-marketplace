import { Component, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { PlatformService } from '../../../core/services/resource.services';
import { AnalyticsData } from '../../../core/models/models';
import {
  formatCurrency,
  formatCurrencyRange,
  formatDate,
  humanizeStatus,
} from '../../../core/utils/format';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'pl-admin-analytics',
  standalone: true,
  imports: [RouterLink, TablerIconComponent, NgChartsModule, FormsModule],
  template: `
    @if (loading()) {
      <div class="analytics-skeleton" aria-hidden="true">
        <div class="skeleton-kpis">
          @for (i of [0, 1]; track i) {
            <div class="skeleton-block skeleton-kpi"></div>
          }
        </div>
        <div class="skeleton-row">
          <div class="skeleton-block skeleton-panel skeleton-donut"></div>
          <div class="skeleton-block skeleton-panel skeleton-donut"></div>
        </div>
        <div class="skeleton-block skeleton-panel skeleton-chart"></div>
        <div class="skeleton-block skeleton-panel skeleton-list"></div>
      </div>
    } @else {
      <div class="kpis">
        @for (kpi of kpis(); track kpi.label) {
          <article class="pl-panel kpi-col">
            <span class="kpi-icon">
              <tabler-icon [icon]="kpi.icon" [size]="22" />
            </span>
            <span class="kpi-label">{{ kpi.label }}</span>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-breakdown">{{ kpi.sub }}</div>
          </article>
        }
      </div>

      <div class="charts-row">
        <div class="pl-panel donut-col">
          <div class="panel-head">
            <h3 class="panel-title">Members</h3>
          </div>
          <div class="donut-wrap">
            <div class="donut-chart">
              @if (roleDistributionTotal() > 0) {
                <canvas
                  baseChart
                  [data]="roleDonutData()"
                  [options]="donutOptions"
                  [type]="'doughnut'"
                ></canvas>
              } @else {
                <div class="chart-empty">No members yet</div>
              }
            </div>
            @if (roleDistributionTotal() > 0) {
              <div class="donut-legend">
                @for (item of roleDistribution(); track item.label) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.background-color]="getRoleColor(item.label)"></span>
                    <span class="legend-label">{{ item.label }}</span>
                    <span class="legend-value">{{ item.value }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="pl-panel donut-col">
          <div class="panel-head">
            <h3 class="panel-title">Projects status</h3>
          </div>
          <div class="donut-wrap">
            <div class="donut-chart">
              @if (statusDistributionTotal() > 0) {
                <canvas
                  baseChart
                  [data]="statusDonutData()"
                  [options]="donutOptions"
                  [type]="'doughnut'"
                ></canvas>
              } @else {
                <div class="chart-empty">No projects yet</div>
              }
            </div>
            @if (statusDistributionTotal() > 0) {
              <div class="donut-legend">
                @for (item of statusDistribution(); track item.label) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.background-color]="getStatusColor(item.label)"></span>
                    <span class="legend-label">{{ item.label }}</span>
                    <span class="legend-value">{{ item.value }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="pl-panel chart-col">
        <div class="panel-head">
          <h3 class="panel-title">Platform fees collected</h3>
          <span class="panel-note">Last 6 months</span>
        </div>

        <div class="chart-wrap">
          @if (hasAnyFeeData()) {
            <canvas
              baseChart
              [data]="feeChartData()"
              [options]="feeChartOptions"
              [type]="'bar'"
            ></canvas>
          } @else {
            <div class="chart-empty">No fee data yet</div>
          }
        </div>

        @if (hasAnyFeeData()) {
          <p class="chart-summary">Total collected: {{ formatCurrency(totalFeesCollected()) }}</p>
        }
      </div>

      <div class="pl-panel settings-panel">
        <div class="panel-head">
          <h3 class="panel-title">Platform fee setting</h3>
        </div>
        <div class="fee-setting">
          <div class="fee-setting-row">
            <label for="fee-percent">Platform fee percentage</label>
            <div class="fee-input-wrap">
              <input
                id="fee-percent"
                type="number"
                class="pl-input"
                min="0"
                max="100"
                step="0.1"
                [ngModel]="editingFeePercent()"
                (ngModelChange)="onFeePercentChange($event)"
              />
              <span class="fee-input-suffix">%</span>
            </div>
          </div>
          <button
            class="pl-btn pl-btn--accent"
            [disabled]="savingFee() || editingFeePercent() === platformFeePercent()"
            (click)="saveFeePercent()"
          >
            {{ savingFee() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="pl-panel">
        <div class="panel-head">
          <h3 class="panel-title">Recent activity</h3>
        </div>

        @if (recentProjects().length > 0) {
          <p class="activity-group-label">Projects</p>
          <div class="activity-list">
            @for (project of recentProjects(); track project._id) {
              <div class="activity-row">
                <div class="activity-info">
                  <a [routerLink]="['/projects', project._id]" class="activity-name">{{ project.title }}</a>
                  <span class="activity-meta">{{ formatDate(project.createdAt) }}</span>
                </div>
                <div class="activity-side">
                  <span class="activity-price">{{ formatCurrencyRange(project.minBudget, project.maxBudget) }}</span>
                  <span class="pl-tag" [class]="statusClass(project.status)">{{ humanizeStatus(project.status) }}</span>
                </div>
              </div>
            }
          </div>
        }

        @if (recentContracts().length > 0) {
          <p class="activity-group-label">Contracts</p>
          <div class="activity-list">
            @for (contract of recentContracts(); track contract._id) {
              <div class="activity-row">
                <div class="activity-info">
                  <span class="activity-name">{{ contract.project?.title ?? 'Untitled project' }}</span>
                  <span class="activity-meta">{{ contract.client?.name }} → {{ contract.freelancer?.name }}</span>
                </div>
                <div class="activity-side">
                  <span class="activity-price">{{ formatCurrency(contract.agreedPrice) }}</span>
                  <span class="pl-tag" [class]="statusClass(contract.status)">{{ humanizeStatus(contract.status) }}</span>
                </div>
              </div>
            }
          </div>
        }

        @if (recentProjects().length === 0 && recentContracts().length === 0) {
          <div class="pl-empty">
            <p class="pl-empty__title">Nothing yet</p>
            <p class="pl-empty__body">Recent projects and contracts will show up here as they are created.</p>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 1199.98px) {
        .kpis {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 767.98px) {
        .kpis {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 479.98px) {
        .kpis {
          grid-template-columns: 1fr;
        }
      }

      .kpi-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1.4rem 1.25rem;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          transform 150ms ease;
      }

      .kpi-col:hover {
        border-color: var(--pl-petrol);
        box-shadow: 0 8px 24px rgba(23, 21, 18, 0.08);
        transform: translateY(-2px);
      }

      .kpi-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        margin-inline: auto;
        border-radius: 50%;
        background-color: rgba(36, 92, 90, 0.1);
        color: var(--pl-petrol);
        flex-shrink: 0;
      }

      .kpi-label {
        margin-top: 0.75rem;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pl-ink-faint);
      }

      .kpi-value {
        font-family: var(--pl-font-display);
        font-size: 2rem;
        line-height: 1.1;
        margin-top: 0.35rem;
        color: var(--pl-ink);
      }

      .kpi-breakdown {
        width: 100%;
        border-top: 1px solid var(--pl-line);
        margin-top: 0.8rem;
        padding-top: 0.7rem;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--pl-ink-faint);
      }

      @media (prefers-reduced-motion: reduce) {
        .kpi-col {
          transition: none;
        }

        .kpi-col:hover {
          transform: none;
        }
      }

      .charts-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 991.98px) {
        .charts-row {
          grid-template-columns: 1fr;
        }
      }

      .donut-col {
        min-height: 320px;
      }

      .donut-wrap {
        display: grid;
        grid-template-columns: 190px 130px;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        min-height: 240px;
        padding: 0.25rem 0;
      }

      .donut-chart {
        width: 190px;
        height: 190px;
        flex: 0 0 190px;
        position: relative;
      }

      .chart-empty {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        color: var(--pl-ink-faint);
        font-size: 0.9rem;
      }

      .donut-chart .chart-empty {
        border: 1px dashed var(--pl-line);
        border-radius: 50%;
        text-align: center;
        padding: 1.5rem;
      }

      @media (max-width: 575.98px) {
        .donut-wrap {
          display: flex;
          flex-direction: column;
          min-height: 0;
          padding-bottom: 0.25rem;
        }
      }

      .donut-legend {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        width: 130px;
      }

      @media (max-width: 575.98px) {
        .donut-legend {
          width: 100%;
          min-width: 0;
        }
      }

      .legend-item {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--pl-ink-soft);
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .legend-label {
        min-width: 0;
      }

      .legend-value {
        font-weight: 600;
        color: var(--pl-ink);
        text-align: right;
      }

      .panel-head {
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

      .panel-note {
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--pl-ink-faint);
      }

      .chart-col {
        margin-bottom: 1.5rem;
      }

      .chart-wrap {
        position: relative;
        height: 280px;
      }

      @media (max-width: 575.98px) {
        .chart-wrap {
          height: 210px;
        }
      }

      .chart-summary {
        text-align: right;
        font-size: 0.82rem;
        color: var(--pl-ink-faint);
        margin-top: 0.6rem;
      }

      .settings-panel {
        margin-bottom: 1.5rem;
      }

      .fee-setting {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .fee-setting-row {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .fee-setting-row label {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--pl-ink-soft);
        white-space: nowrap;
      }

      .fee-input-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        max-width: 200px;
        position: relative;
      }

      .fee-input-wrap .pl-input {
        flex: 1;
        padding-right: 2.5rem;
      }

      .fee-input-suffix {
        position: absolute;
        right: 0.75rem;
        color: var(--pl-ink-faint);
        font-size: 0.9rem;
        pointer-events: none;
      }

      .fee-setting .pl-btn {
        align-self: flex-start;
        width: auto;
      }

      .activity-group-label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pl-ink-faint);
        margin: 0 0 0.5rem;
      }

      .activity-list + .activity-group-label {
        border-top: 1px solid var(--pl-line);
        padding-top: 1.5rem;
        margin: 1.5rem 0 0.5rem;
      }

      .activity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0.4rem;
        border-bottom: 1px solid var(--pl-line);
        border-radius: var(--pl-radius);
        transition: background-color 120ms ease;
      }

      .activity-row:last-child {
        border-bottom: none;
      }

      .activity-row:hover {
        background-color: var(--pl-ivory-soft);
      }

      .activity-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 0.1rem;
      }

      .activity-name {
        font-weight: 600;
        font-size: 0.92rem;
        color: var(--pl-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      a.activity-name:hover {
        color: var(--pl-petrol);
      }

      .activity-meta {
        font-size: 0.8rem;
        color: var(--pl-ink-faint);
      }

      .activity-side {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        flex-shrink: 0;
      }

      .activity-price {
        font-family: var(--pl-font-display);
        font-size: 1.05rem;
        color: var(--pl-ink);
        white-space: nowrap;
      }

      /* ------------------------------------------------------------ */
      /* Skeleton loading state                                        */
      /* ------------------------------------------------------------ */

      .analytics-skeleton {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .skeleton-kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 1rem;
      }

      @media (max-width: 1199.98px) {
        .skeleton-kpis {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 767.98px) {
        .skeleton-kpis {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 479.98px) {
        .skeleton-kpis {
          grid-template-columns: 1fr;
        }
      }

      .skeleton-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      @media (max-width: 991.98px) {
        .skeleton-row {
          grid-template-columns: 1fr;
        }
      }

      .skeleton-block {
        position: relative;
        overflow: hidden;
        background-color: var(--pl-ivory-soft);
        border: 1px solid var(--pl-line);
        border-radius: var(--pl-radius-lg);
      }

      .skeleton-block::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          100deg,
          transparent 30%,
          rgba(255, 255, 255, 0.75) 50%,
          transparent 70%
        );
        transform: translateX(-100%);
        animation: pl-skeleton-shimmer 1.4s ease-in-out infinite;
      }

      .skeleton-kpi {
        height: 118px;
      }

      .skeleton-panel {
        height: 260px;
      }

      .skeleton-donut {
        height: 320px;
      }

      .skeleton-chart {
        height: 300px;
      }

      .skeleton-list {
        height: 300px;
      }

      @keyframes pl-skeleton-shimmer {
        to {
          transform: translateX(100%);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton-block::after {
          animation: none;
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .activity-row {
          transition: none;
        }
      }
    `,
  ],
})
export class AdminAnalytics implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly platformService = inject(PlatformService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loading = signal(true);
  private readonly raw = signal<AnalyticsData | null>(null);

  protected readonly formatCurrency = formatCurrency;
  protected readonly formatCurrencyRange = formatCurrencyRange;
  protected readonly formatDate = formatDate;
  protected readonly humanizeStatus = humanizeStatus;

  protected readonly editingFeePercent = signal(10);
  protected readonly savingFee = signal(false);

  private safeNum(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  protected readonly kpis = computed(() => {
    const data = this.raw();
    if (!data) return [];
    const k = data.kpis;
    return [
      { icon: 'clipboard-check', label: 'Active contracts', value: this.safeNum(k.activeContracts), sub: `${this.safeNum(k.totalContracts)} total · ${this.safeNum(k.completedContracts)} completed` },
      { icon: 'percentage', label: 'Platform fee', value: `${this.safeNum(k.platformFeePercent, 10)}%`, sub: 'Per transaction' },
      { icon: 'coins', label: 'Platform revenue', value: formatCurrency(this.safeNum(k.platformRevenue)), sub: 'Fees collected' },
    ];
  });

  protected readonly roleDistribution = computed(() => this.raw()?.roleDistribution ?? []);
  protected readonly statusDistribution = computed(() => this.raw()?.statusDistribution ?? []);

  protected readonly roleDistributionTotal = computed(() =>
    this.roleDistribution().reduce((sum, d) => sum + this.safeNum(d.value), 0)
  );

  protected readonly statusDistributionTotal = computed(() =>
    this.statusDistribution().reduce((sum, d) => sum + this.safeNum(d.value), 0)
  );

  protected readonly roleDonutData = computed(() => {
    const dist = this.roleDistribution();
    return {
      labels: dist.map((d) => d.label),
      datasets: [
        {
          data: dist.map((d) => this.safeNum(d.value)),
          backgroundColor: ['#245c5a', '#a98245'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  });

  protected readonly statusDonutData = computed(() => {
    const dist = this.statusDistribution();
    return {
      labels: dist.map((d) => d.label),
      datasets: [
        {
          data: dist.map((d) => this.safeNum(d.value)),
          backgroundColor: ['#3f5c31', '#8a8274', '#245c5a', '#694451'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  });

  protected readonly donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#171512',
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 600 },
        bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
        cornerRadius: 3,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || '';
            const value = Number(ctx.parsed) || 0;
            const data = ctx.chart.data.datasets[0].data as number[];
            const total = data.reduce((a: number, b: number) => a + b, 0);
            const pct = total ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  protected readonly recentProjects = computed(() => this.raw()?.recentActivity?.projects?.slice(0, 3) ?? []);
  protected readonly recentContracts = computed(() => this.raw()?.recentActivity?.contracts?.slice(0, 3) ?? []);

  protected readonly feeChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#171512',
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 600 },
        bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
        cornerRadius: 3,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Platform fees: ${formatCurrency(this.safeNum(ctx.parsed.y))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          color: '#8a8274',
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(34,31,26,0.08)' },
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          color: '#8a8274',
          callback: (value) => formatCurrency(value as number),
        },
        border: { display: false },
      },
    },
  };

  protected readonly feeChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#a98245',
        hoverBackgroundColor: '#8f6e3a',
        borderRadius: 4,
        barThickness: 28,
        maxBarThickness: 40,
      },
    ],
  });

  protected readonly hasAnyFeeData = computed(() => {
    const ds = this.feeChartData().datasets?.[0]?.data;
    return Array.isArray(ds) && ds.some((v) => this.safeNum(v) > 0);
  });

  protected readonly totalFeesCollected: () => number = computed(() => {
    const ds = this.feeChartData().datasets?.[0]?.data;
    if (!Array.isArray(ds)) return 0;
    return ds.reduce<number>((sum, v) => sum + this.safeNum(v), 0);
  });

  protected readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#171512',
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 600 },
        bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
        cornerRadius: 3,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          color: '#8a8274',
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(34,31,26,0.08)' },
        ticks: {
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          color: '#8a8274',
          precision: 0,
        },
        border: { display: false },
      },
    },
  };

  protected readonly chartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#245c5a',
        hoverBackgroundColor: '#2f6f6c',
        borderRadius: 4,
        barThickness: 28,
        maxBarThickness: 40,
      },
    ],
  });

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.loading.set(true);
    this.analytics.refresh().subscribe({
      next: (result) => {
        this.raw.set(result);
        this.editingFeePercent.set(this.safeNum(result.kpis?.platformFeePercent, 10));
        this.chartData.set({
          labels: (result.monthlyProjects ?? []).map((m) => m.label),
          datasets: [
            {
              data: (result.monthlyProjects ?? []).map((m) => this.safeNum(m.count)),
              backgroundColor: '#245c5a',
              hoverBackgroundColor: '#2f6f6c',
              borderRadius: 4,
              barThickness: 28,
              maxBarThickness: 40,
            },
          ],
        });
        this.feeChartData.set({
          labels: (result.monthlyFees ?? []).map((m) => m.label),
          datasets: [
            {
              data: (result.monthlyFees ?? []).map((m) => this.safeNum(m.total)),
              backgroundColor: '#a98245',
              hoverBackgroundColor: '#8f6e3a',
              borderRadius: 4,
              barThickness: 28,
              maxBarThickness: 40,
            },
          ],
        });
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  protected getRoleColor(label: string): string {
    return label === 'Clients' ? '#245c5a' : '#a98245';
  }

  protected getStatusColor(label: string): string {
    const colors: Record<string, string> = {
      Completed: '#3f5c31',
      Open: '#8a8274',
      'In Progress': '#245c5a',
      Cancelled: '#694451',
    };
    return colors[label] ?? '#8a8274';
  }

  protected onFeePercentChange(value: number): void {
    this.editingFeePercent.set(Math.max(0, Math.min(100, Math.round(value * 10) / 10)));
  }

  protected saveFeePercent(): void {
    const value = this.editingFeePercent();
    if (value === this.platformFeePercent()) return;

    this.savingFee.set(true);
    this.platformService.updateSettings(value).subscribe({
      next: (res) => {
        const updated = this.safeNum(res?.platformFeePercent, value);
        this.toast.success('Platform fee percentage updated.');
        this.raw.update((d) => d ? { ...d, kpis: { ...d.kpis, platformFeePercent: updated } } : null);
        this.editingFeePercent.set(updated);
        this.savingFee.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update platform fee:', err);
        this.toast.error('Failed to update platform fee percentage.');
        this.editingFeePercent.set(this.platformFeePercent());
        this.savingFee.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  protected platformFeePercent = computed(() => this.safeNum(this.raw()?.kpis?.platformFeePercent, 10));

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'pl-tag--active',
      IN_PROGRESS: 'pl-tag--active',
      COMPLETED: 'pl-tag--completed',
      CANCELLED: 'pl-tag--cancelled',
      ACTIVE: 'pl-tag--active',
      WORK_SUBMITTED: 'pl-tag--active',
    };
    return map[status] ?? '';
  }
}
