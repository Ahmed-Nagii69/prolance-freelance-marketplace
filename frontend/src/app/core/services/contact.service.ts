import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/** The one optional field on the contact form. */
export type ContactTopic =
  | 'Account'
  | 'Project'
  | 'Contract'
  | 'Delivery'
  | 'Dispute'
  | 'Payments'
  | 'General question';

export interface ContactRequest {
  name: string;
  email: string;
  topic: ContactTopic | '';
  subject: string;
  message: string;
}

export interface ContactAccepted {
  topic: ContactTopic | null;
}

/** Mirrors the server limits so the form can explain a problem before sending. */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 4000 },
} as const;

@Injectable({ providedIn: 'root' })
export class ContactService {
  constructor(private readonly api: ApiService) {}

  send(payload: ContactRequest): Observable<ContactAccepted> {
    return this.api.post<ContactAccepted>('/contact', payload);
  }
}
