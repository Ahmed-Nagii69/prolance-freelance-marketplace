import { Component } from '@angular/core';

@Component({
  selector: 'pl-spinner',
  standalone: true,
  template: ` <div class="pl-spinner" aria-label="Loading" role="status"></div> `,
})
export class Spinner {}

@Component({
  selector: 'pl-loading',
  standalone: true,
  imports: [Spinner],
  template: ` <div class="pl-loading"><pl-spinner /> Loading…</div> `,
})
export class LoadingBlock {}