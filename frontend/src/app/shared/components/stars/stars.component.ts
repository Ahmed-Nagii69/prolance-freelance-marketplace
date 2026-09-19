import { Component, input } from '@angular/core';

@Component({
  selector: 'pl-stars',
  standalone: true,
  template: `
    <span class="pl-stars" [attr.aria-label]="'Rated ' + rating() + ' out of 5'">
      @for (star of stars(); track star; let index = $index) {
        <span aria-hidden="true">
          {{ index < rating() ? '★' : '☆' }}
        </span>
      }
    </span>
  `,
})
export class RatingStars {
  readonly rating = input(0);

  protected readonly stars = (): number[] => [1, 2, 3, 4, 5];
}