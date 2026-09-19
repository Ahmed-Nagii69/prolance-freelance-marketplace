import { Injectable, computed, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let nextToastId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);

  readonly toasts = computed(() => this.toastsSignal());

  show(type: ToastType, message: string): void {
    const toast: Toast = { id: nextToastId++, type, message };
    this.toastsSignal.update((items) => [...items, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 5200);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((item) => item.id !== id));
  }
}