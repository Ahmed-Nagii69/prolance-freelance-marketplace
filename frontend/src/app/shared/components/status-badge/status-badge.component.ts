import { Component, computed, input } from '@angular/core';
import { humanizeStatus } from '../../../core/utils/format';

@Component({
  selector: 'pl-status-badge',
  standalone: true,
  template: ` <span class="pl-status {{ statusClass() }}">{{ label() }}</span> `,
})
export class StatusBadge {
  readonly status = input.required<string>();

  protected readonly label = computed(() => humanizeStatus(this.status()));

  protected readonly statusClass = computed(() => {
    const status = this.status().toLowerCase();
    if (status.includes('open') || status.includes('active')) {
      return 'pl-status--open';
    }
    if (status.includes('progress')) {
      return 'pl-status--in-progress';
    }
    if (status.includes('completed')) {
      return 'pl-status--completed';
    }
    if (status.includes('cancelled') || status.includes('rejected')) {
      return 'pl-status--cancelled';
    }
    if (status.includes('accepted')) {
      return 'pl-status--accepted';
    }
    if (status.includes('pending')) {
      return 'pl-status--pending';
    }
    return '';
  });
}