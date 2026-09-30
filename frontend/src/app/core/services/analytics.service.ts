import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  AnalyticsData,
  ClientAnalyticsData,
  FreelancerAnalyticsData,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiData = signal<AnalyticsData | null>(null);
  private readonly freelancerData = signal<FreelancerAnalyticsData | null>(null);
  private readonly clientData = signal<ClientAnalyticsData | null>(null);

  /** Latest analytics payload (null until first successful fetch). */
  readonly data = this.apiData.asReadonly();

  constructor(private readonly api: ApiService) {}

  /** Return cached analytics if available. */
  getAnalytics(): Observable<AnalyticsData> {
    const cached = this.apiData();
    if (cached) return of(cached);
    return this.fetchAnalytics();
  }

  /** Always fetch fresh data from the server, replacing the cache. */
  refresh(): Observable<AnalyticsData> {
    return this.fetchAnalytics();
  }

  /** Personal dashboard of the signed-in freelancer. */
  getFreelancerAnalytics(): Observable<FreelancerAnalyticsData> {
    const cached = this.freelancerData();
    if (cached) return of(cached);
    return this.api
      .get<FreelancerAnalyticsData>('/analytics/freelancer')
      .pipe(tap((data) => this.freelancerData.set(data)));
  }

  refreshFreelancerAnalytics(): Observable<FreelancerAnalyticsData> {
    return this.api
      .get<FreelancerAnalyticsData>('/analytics/freelancer')
      .pipe(tap((data) => this.freelancerData.set(data)));
  }

  /** Personal dashboard of the signed-in client. */
  getClientAnalytics(): Observable<ClientAnalyticsData> {
    const cached = this.clientData();
    if (cached) return of(cached);
    return this.api
      .get<ClientAnalyticsData>('/analytics/client')
      .pipe(tap((data) => this.clientData.set(data)));
  }

  refreshClientAnalytics(): Observable<ClientAnalyticsData> {
    return this.api
      .get<ClientAnalyticsData>('/analytics/client')
      .pipe(tap((data) => this.clientData.set(data)));
  }

  invalidate(): void {
    this.apiData.set(null);
  }

  private fetchAnalytics(): Observable<AnalyticsData> {
    return this.api
      .get<AnalyticsData>('/analytics')
      .pipe(tap((data) => this.apiData.set(data)));
  }
}
