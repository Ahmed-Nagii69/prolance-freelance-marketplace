import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Contract,
  ContractListData,
  Message,
  MessageListData,
  Proposal,
  ProposalListData,
  Review,
  ReviewListData,
  Service,
  Skill,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProposalService {
  constructor(private readonly api: ApiService) {}

  createProposal(payload: {
    project: string;
    coverLetter: string;
    price: number;
    deliveryTime: number;
  }): Observable<Proposal> {
    return this.api.post<Proposal>('/proposals', payload);
  }

  getMyProposals(page = 1, limit = 20): Observable<ProposalListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<ProposalListData>('/proposals/my', params);
  }

  getProjectProposals(
    projectId: string,
    page = 1,
    limit = 20,
  ): Observable<ProposalListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<ProposalListData>(
      `/proposals/projects/${projectId}`,
      params,
    );
  }

  getProposal(id: string): Observable<Proposal> {
    return this.api.get<Proposal>(`/proposals/${id}`);
  }

  acceptProposal(id: string): Observable<Proposal> {
    return this.api.patch<Proposal>(`/proposals/${id}/accept`, {});
  }

  rejectProposal(id: string): Observable<Proposal> {
    return this.api.patch<Proposal>(`/proposals/${id}/reject`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(private readonly api: ApiService) {}

  getContracts(page = 1, limit = 20): Observable<ContractListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<ContractListData>('/contracts', params);
  }

  getContract(id: string): Observable<Contract> {
    return this.api.get<Contract>(`/contracts/${id}`);
  }

  completeContract(id: string): Observable<Contract> {
    return this.api.patch<Contract>(`/contracts/${id}/complete`, {});
  }

  cancelContract(id: string): Observable<Contract> {
    return this.api.patch<Contract>(`/contracts/${id}/cancel`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  constructor(private readonly api: ApiService) {}

  sendMessage(payload: {
    receiver: string;
    project: string;
    content: string;
  }): Observable<Message> {
    return this.api.post<Message>('/messages', payload);
  }

  getProjectMessages(
    projectId: string,
    page = 1,
    limit = 100,
  ): Observable<MessageListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<MessageListData>(
      `/messages/project/${projectId}`,
      params,
    );
  }

  markMessageAsRead(id: string): Observable<Message> {
    return this.api.patch<Message>(`/messages/${id}/read`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  constructor(private readonly api: ApiService) {}

  createReview(payload: {
    contract: string;
    rating: number;
    comment: string;
  }): Observable<Review> {
    return this.api.post<Review>('/reviews', payload);
  }

  getUserReviews(id: string, page = 1, limit = 20): Observable<ReviewListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<ReviewListData>(`/reviews/user/${id}`, params);
  }
}

@Injectable({ providedIn: 'root' })
export class SkillService {
  constructor(private readonly api: ApiService) {}

  getSkills(): Observable<Skill[]> {
    return this.api.get<Skill[]>('/skills');
  }

  createSkill(payload: {
    name: string;
    description?: string;
  }): Observable<Skill> {
    return this.api.post<Skill>('/skills', payload);
  }
}

@Injectable({ providedIn: 'root' })
export class ServiceService {
  constructor(private readonly api: ApiService) {}

  getServices(): Observable<Service[]> {
    return this.api.get<Service[]>('/services');
  }

  createService(payload: {
    title: string;
    description: string;
    price: number;
    skills: string[];
  }): Observable<Service> {
    return this.api.post<Service>('/services', payload);
  }
}