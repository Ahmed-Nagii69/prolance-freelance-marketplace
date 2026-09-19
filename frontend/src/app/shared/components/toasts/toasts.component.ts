import { Component } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'pl-toasts',
  standalone: true,
  template: `
    <div class="pl-toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pl-toast pl-toast--{{ toast.type }}"> 
          <span>{{ toast.message }}</span>
          <button
            type="button"
            class="pl-toast__close"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >×</button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  constructor(readonly toastService: ToastService) {}
}