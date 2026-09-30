import { Component, input } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

export interface KpiCard {
  icon: string;
  label: string;
  value: string;
  sub: string;
}

@Component({
  selector: 'pl-kpi-grid',
  standalone: true,
  imports: [TablerIconComponent],
  template: `
    <div class="kpis">
      @for (kpi of kpis(); track kpi.label) {
        <article class="pl-panel kpi">
          <span class="kpi__icon">
            <tabler-icon [icon]="kpi.icon" [size]="22" />
          </span>
          <span class="kpi__label">{{ kpi.label }}</span>
          <div class="kpi__value">{{ kpi.value }}</div>
          <div class="kpi__sub">{{ kpi.sub }}</div>
        </article>
      }
    </div>
  `,
  styles: [
    `
      .kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      @media (max-width: 991.98px) {
        .kpis {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 479.98px) {
        .kpis {
          grid-template-columns: 1fr;
        }
      }

      .kpi {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1.4rem 1.25rem;
      }

      .kpi__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background-color: rgba(36, 92, 90, 0.1);
        color: var(--pl-petrol);
        flex-shrink: 0;
      }

      .kpi__label {
        margin-top: 0.75rem;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--pl-ink-faint);
      }

      .kpi__value {
        font-family: var(--pl-font-display);
        font-size: 1.9rem;
        line-height: 1.1;
        margin-top: 0.35rem;
        color: var(--pl-ink);
      }

      .kpi__sub {
        width: 100%;
        border-top: 1px solid var(--pl-line);
        margin-top: 0.8rem;
        padding-top: 0.7rem;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--pl-ink-faint);
      }
    `,
  ],
})
export class KpiGrid {
  readonly kpis = input<KpiCard[]>([]);
}
