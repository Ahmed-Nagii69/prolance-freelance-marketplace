import { Component, computed, input } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DistributionData } from '../../../core/models/models';

const PALETTE = ['#245c5a', '#a98245', '#3f5c31', '#8a8274', '#694451', '#5b3f73'];

@Component({
  selector: 'pl-status-chart',
  standalone: true,
  imports: [NgChartsModule],
  template: `
    <div class="pl-panel">
      <div class="head">
        <h3 class="title">{{ title() }}</h3>
        @if (note()) {
          <span class="note">{{ note() }}</span>
        }
      </div>

      @if (total() > 0) {
        <div class="wrap">
          <div class="chart">
            <canvas
              baseChart
              [data]="chartData()"
              [options]="options"
              [type]="'doughnut'"
            ></canvas>
          </div>
          <div class="legend">
            @for (item of items(); track item.label) {
              <div class="legend__item">
                <span class="legend__dot" [style.background-color]="colorAt($index)"></span>
                <span class="legend__label">{{ item.label }}</span>
                <span class="legend__value">{{ item.value }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="chart-empty">{{ emptyText() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.15rem;
      }

      .title {
        font-family: var(--pl-font-display);
        font-size: 1.2rem;
        margin: 0;
      }

      .note {
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--pl-ink-faint);
      }

      .wrap {
        display: grid;
        grid-template-columns: 180px 140px;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
      }

      .chart {
        width: 180px;
        height: 180px;
        position: relative;
      }

      .legend {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .legend__item {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--pl-ink-soft);
      }

      .legend__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .legend__value {
        font-weight: 600;
        color: var(--pl-ink);
        text-align: right;
      }

      .chart-empty {
        display: grid;
        place-items: center;
        min-height: 180px;
        border: 1px dashed var(--pl-line);
        border-radius: var(--pl-radius-lg);
        background-color: var(--pl-ivory-soft);
        color: var(--pl-ink-faint);
        font-size: 0.9rem;
        text-align: center;
        padding: 1rem;
      }

      @media (max-width: 575.98px) {
        .wrap {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .legend {
          width: 100%;
        }
      }
    `,
  ],
})
export class StatusChart {
  readonly title = input.required<string>();
  readonly items = input<DistributionData[]>([]);
  readonly note = input('');
  readonly emptyText = input('No data yet');

  protected readonly options: ChartConfiguration<'doughnut'>['options'] = {
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
        callbacks: {
          label: (ctx) => `${ctx.label ?? ''}: ${Number(ctx.parsed) || 0}`,
        },
      },
    },
  };

  protected readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + (Number(item.value) || 0), 0),
  );

  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: this.items().map((item) => item.label),
    datasets: [
      {
        data: this.items().map((item) => Number(item.value) || 0),
        backgroundColor: this.items().map((_, index) => PALETTE[index % PALETTE.length]),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  }));

  protected colorAt(index: number): string {
    return PALETTE[index % PALETTE.length];
  }
}
