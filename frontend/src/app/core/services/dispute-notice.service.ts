import { Injectable, signal } from '@angular/core';

export interface DisputeNoticeRequest {
  projectTitle: string;
  status: 'OPEN' | 'UNDER_REVIEW';
  reason: string;
  raisedByName: string;
  openedAt: string;
  /** Where the reader goes to read the full case file. */
  contractId: string | null;
}

/**
 * Carries the one-way "this project is frozen" notice to the single dialog that
 * renders it. There is no decision to return and nothing is written from here:
 * the dialog only reports and closes, and the page behind it keeps the same
 * status banner, so dismissing it never hides the state.
 */
@Injectable({ providedIn: 'root' })
export class DisputeNoticeService {
  private readonly request = signal<DisputeNoticeRequest | null>(null);

  readonly current = this.request.asReadonly();

  open(request: DisputeNoticeRequest): void {
    this.request.set(request);
  }

  close(): void {
    this.request.set(null);
  }
}
