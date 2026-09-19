import { Component, input, output } from '@angular/core';
import { Pagination } from '../../../core/models/models';

@Component({
  selector: 'pl-pagination',
  standalone: true,
  template: `
    <nav
      class="d-flex align-items-center justify-content-between flex-wrap gap-2"
      aria-label="Pagination"
    >
      <span class="pl-faint" style="font-size: 0.84rem">
        Page {{ data().page }} of {{ data().totalPages }}
        @if (data().total > 0) {
          · {{ data().total }} item{{ data().total === 1 ? '' : 's' }}
        }
      </span>
      <div class="d-flex gap-2">
        <button
          type="button"
          class="pl-btn pl-btn--outline pl-btn--sm"
          [disabled]="!data().hasPreviousPage"
          (click)="pageChange.emit(data().page - 1)"
        >
          ← Previous
        </button>
        <button
          type="button"
          class="pl-btn pl-btn--outline pl-btn--sm"
          [disabled]="!data().hasNextPage"
          (click)="pageChange.emit(data().page + 1)"
        >
          Next →
        </button>
      </div>
    </nav>
  `,
})
export class PaginationControls {
  readonly data = input.required<Pagination>();
  readonly pageChange = output<number>();
}