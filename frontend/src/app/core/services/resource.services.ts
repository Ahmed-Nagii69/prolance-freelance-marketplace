import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Contract,
  ContractListData,
  Proposal,
  ProposalListData,
  Review,
  ReviewListData,
  Message,
  MessageListData,
  ConversationListData,
  NotificationListData,
  WalletData,
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

  submitWork(id: string, description: string): Observable<Contract> {
    return this.api.patch<Contract>(`/contracts/${id}/submit-work`, {
      description,
    });
  }

  approveWork(id: string): Observable<Contract> {
    return this.api.patch<Contract>(`/contracts/${id}/approve-work`, {});
  }

  rejectWork(id: string, reason?: string): Observable<Contract> {
    return this.api.patch<Contract>(`/contracts/${id}/reject-work`, {
      reason: reason ?? '',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  constructor(private readonly api: ApiService) {}

  getConversations(): Observable<ConversationListData> {
    return this.api.get<ConversationListData>('/messages/conversations');
  }

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

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.api.get<{ unreadCount: number }>('/messages/unread-count');
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

  getContractReviewStatus(
    contractId: string,
  ): Observable<{ reviewed: boolean }> {
    return this.api.get<{ reviewed: boolean }>(
      `/reviews/contract/${contractId}/me`,
    );
  }

  getUserReviews(id: string, page = 1, limit = 20): Observable<ReviewListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<ReviewListData>(`/reviews/user/${id}`, params);
  }
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  constructor(private readonly api: ApiService) {}

  getWallet(): Observable<WalletData> {
    return this.api.get<WalletData>('/wallet');
  }

  fundWallet(amount: number): Observable<{ balance: number; amount: number }> {
    return this.api.post<{ balance: number; amount: number }>('/wallet/fund', {
      amount,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private readonly api: ApiService) {}

  getNotifications(page = 1, limit = 20): Observable<NotificationListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<NotificationListData>('/notifications', params);
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.api.get<{ unreadCount: number }>('/notifications/unread-count');
  }

  markAsRead(id: string): Observable<null> {
    return this.api.patch<null>(`/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<null> {
    return this.api.patch<null>('/notifications/read-all', {});
  }
}