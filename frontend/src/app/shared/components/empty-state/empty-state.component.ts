import { Component, input } from '@angular/core';

@Component({
  selector: 'pl-empty-state',
  standalone: true,
  template: `
    <div class="pl-empty">
      <p class="pl-empty__title">{{ title() }}</p>
      <p class="pl-empty__body">{{ body() }}</p>
      <ng-content select="[pl-empty-action]"></ng-content>
    </div>
  `,
})
export class EmptyState {
  readonly title = input<string>('Nothing here yet');
  readonly body = input<string>('');
}