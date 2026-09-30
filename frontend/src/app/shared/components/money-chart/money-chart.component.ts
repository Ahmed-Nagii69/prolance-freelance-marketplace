import { Component, computed, input } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MonthlyFeeData } from '../../../core/models/models';
import { formatCurrency } from '../../../core/utils/format';

@Component({
  selector: 'pl-money-chart',
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

      @if (hasData()) {
        <div class="wrap">
          <canvas
            baseChart
            [data]="chartData()"
            [options]="options"
            [type]="'bar'"
          ></canvas>
        </div>
        <p class="summary">Total shown: {{ formatCurrency(total()) }}</p>
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
        position: relative;
        height: 260px;
      }

      @media (max-width: 575.98px) {
        .wrap {
          height: 210px;
        }
      }

      .summary {
        text-align: right;
        font-size: 0.82rem;
        color: var(--pl-ink-faint);
        margin: 0.6rem 0 0;
      }

      .chart-empty {
        display: grid;
        place-items: center;
        min-height: 200px;
        border: 1px dashed var(--pl-line);
        border-radius: var(--pl-radius-lg);
        background-color: var(--pl-ivory-soft);
        color: var(--pl-ink-faint);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class MoneyChart {
  readonly title = input.required<string>();
  readonly series = input<MonthlyFeeData[]>([]);
  readonly note = input('');
  readonly emptyText = input('No payments recorded yet');

  protected readonly formatCurrency = formatCurrency;

  protected readonly options: ChartConfiguration<'bar'>['options'] = {
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
          label: (ctx) => formatCurrency(Number(ctx.parsed.y) || 0),
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

  protected readonly total = computed(() =>
    this.series().reduce((sum, point) => sum + (Number(point.total) || 0), 0),
  );

  protected readonly hasData = computed(() => this.total() > 0);

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.series().map((point) => point.label),
    datasets: [
      {
        data: this.series().map((point) => Number(point.total) || 0),
        backgroundColor: '#245c5a',
        hoverBackgroundColor: '#2f6f6c',
        borderRadius: 4,
        barThickness: 28,
        maxBarThickness: 40,
      },
    ],
  }));
}
