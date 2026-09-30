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
    // Checked before the wider matches below: "under review" is a dispute that
    // an admin is working through and already reads as in-progress, while a
    // bare "disputed" is the state the project and the contract sit in.
    if (status.includes('disputed')) {
      return 'pl-status--disputed';
    }
    if (status.includes('open') || status.includes('active')) {
      return 'pl-status--open';
    }
    if (status.includes('progress') || status.includes('review')) {
      return 'pl-status--in-progress';
    }
    if (status.includes('submitted')) {
      return 'pl-status--submitted';
    }
    if (status.includes('completed') || status.includes('resolved')) {
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