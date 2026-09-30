import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface BanTarget {
  id: string;
  name: string;
}

export interface BanRequest {
  target: BanTarget;
  /** Optional line under the heading explaining why this ban is being applied. */
  context?: string;
}

export interface BanDecision {
  durationDays: number;
  reason: string;
}

/**
 * Asks the admin to confirm a ban before anything is written, in the same shape
 * as the existing confirm dialog: the caller opens it, receives the decision
 * once, and decides what to do. The account is never modified from here.
 */
@Injectable({ providedIn: 'root' })
export class BanDialogService {
  private readonly state = signal<BanRequest | null>(null);
  private resolver: ((decision: BanDecision | null) => void) | null = null;

  readonly current = signal<BanRequest | null>(null);

  open(request: BanRequest): Observable<BanDecision | null> {
    this.state.set(request);
    this.current.set(request);
    return new Observable<BanDecision | null>((subscriber) => {
      this.resolver = (decision) => {
        subscriber.next(decision);
        subscriber.complete();
        this.state.set(null);
        this.current.set(null);
      };
    });
  }

  apply(durationDays: number, reason: string): void {
    this.settle({ durationDays, reason });
  }

  cancel(): void {
    this.settle(null);
  }

  private settle(decision: BanDecision | null): void {
    const resolver = this.resolver;
    // Cleared first, so a second click cannot deliver a second decision.
    this.resolver = null;
    resolver?.(decision);
  }
}
