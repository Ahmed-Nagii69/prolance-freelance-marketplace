import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly state = signal<ConfirmRequest | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  readonly current = computed(() => this.state());

  confirm(request: ConfirmRequest): Observable<boolean> {
    this.state.set(request);
    return new Observable<boolean>((subscriber) => {
      this.resolver = (value) => {
        subscriber.next(value);
        subscriber.complete();
        this.state.set(null);
      };
    });
  }

  accept(): void {
    this.resolver?.(true);
  }

  cancel(): void {
    this.resolver?.(false);
  }
}