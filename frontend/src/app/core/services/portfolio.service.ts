import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PortfolioItem, PortfolioItemPayload } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  constructor(private readonly api: ApiService) {}

  /** Portfolio of the signed-in freelancer. */
  getMyPortfolio(): Observable<PortfolioItem[]> {
    return this.api.get<PortfolioItem[]>('/portfolio/my');
  }

  /** Read-only portfolio of another (public) freelancer profile. */
  getFreelancerPortfolio(freelancerId: string): Observable<PortfolioItem[]> {
    return this.api.get<PortfolioItem[]>(`/portfolio/user/${freelancerId}`);
  }

  createItem(payload: PortfolioItemPayload): Observable<PortfolioItem> {
    return this.api.post<PortfolioItem>('/portfolio', payload);
  }

  updateItem(id: string, payload: PortfolioItemPayload): Observable<PortfolioItem> {
    return this.api.put<PortfolioItem>(`/portfolio/${id}`, payload);
  }

  deleteItem(id: string): Observable<null> {
    return this.api.delete<null>(`/portfolio/${id}`);
  }

  uploadImage(file: File): Observable<{ image: string }> {
    const formData = new FormData();
    formData.append('photo', file, file.name);
    return this.api.post<{ image: string }>('/portfolio/image', formData);
  }
}
