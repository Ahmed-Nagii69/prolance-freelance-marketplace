import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Contract,
  ContractListData,
  Proposal,
  ProposalLimits,
  ProposalListData,
  ProposalSeenView,
  ProjectProposalListData,
  Review,
  ReviewListData,
  Message,
  MessageListData,
  ConversationListData,
  Dispute,
  DisputeListData,
  DisputeOutcome,
  SavedFreelancer,
  NotificationListData,
  WalletData,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  constructor(private readonly api: ApiService) {}

  getSettings(): Observable<{ platformFeePercent: number }> {
    return this.api.get<{ platformFeePercent: number }>('/platform');
  }

  updateSettings(platformFeePercent: number): Observable<{ platformFeePercent: number }> {
    return this.api.put<{ platformFeePercent: number }>('/platform', { platformFeePercent });
  }
}

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

  // The one allowed revision of a submitted bid. The server rejects a second
  // call with PROPOSAL_NOT_EDITABLE.
  updateProposal(
    id: string,
    payload: { coverLetter: string; price: number; deliveryTime: number },
  ): Observable<Proposal> {
    return this.api.patch<Proposal>(`/proposals/${id}`, payload);
  }

  getProjectProposals(
    projectId: string,
    page = 1,
    limit = 20,
    view: ProposalSeenView = 'ALL',
  ): Observable<ProjectProposalListData> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('view', view);
    return this.api.get<ProjectProposalListData>(
      `/proposals/projects/${projectId}`,
      params,
    );
  }

  /**
   * The bid range the server will accept for this project. The form uses these
   * numbers rather than computing its own, so what a freelancer is told and
   * what the API enforces are always the same values.
   */
  getProposalLimits(projectId: string): Observable<ProposalLimits> {
    return this.api.get<ProposalLimits>(`/proposals/limits/${projectId}`);
  }

  /** Records that the client who owns the project has read a proposal. */
  markProposalAsSeen(id: string): Observable<Proposal> {
    return this.api.patch<Proposal>(`/proposals/${id}/seen`, {});
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
export class DisputeService {
  constructor(private readonly api: ApiService) {}

  getDisputes(
    status: string = 'ALL',
    page = 1,
    limit = 20,
  ): Observable<DisputeListData> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page)
      .set('limit', limit);
    return this.api.get<DisputeListData>('/disputes', params);
  }

  getContractDispute(contractId: string): Observable<{ dispute: Dispute | null }> {
    return this.api.get<{ dispute: Dispute | null }>(
      `/contracts/${contractId}/dispute`,
    );
  }

  openDispute(
    contractId: string,
    reason: string,
    description: string,
  ): Observable<Dispute> {
    return this.api.post<Dispute>(`/contracts/${contractId}/dispute`, {
      reason,
      description,
    });
  }

  reviewDispute(id: string, note: string): Observable<Dispute> {
    return this.api.patch<Dispute>(`/disputes/${id}/review`, { note });
  }

  resolveDispute(
    id: string,
    outcome: DisputeOutcome,
    note: string,
    amountToFreelancer?: number,
  ): Observable<Dispute> {
    return this.api.patch<Dispute>(`/disputes/${id}/resolve`, {
      outcome,
      note,
      ...(amountToFreelancer === undefined
        ? {}
        : { amountToFreelancer }),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class SavedFreelancerService {
  constructor(private readonly api: ApiService) {}

  getSavedFreelancers(): Observable<SavedFreelancer[]> {
    return this.api.get<SavedFreelancer[]>('/saved-freelancers');
  }

  getSavedCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>('/saved-freelancers/count');
  }

  getSavedStatus(freelancerId: string): Observable<{ saved: boolean }> {
    return this.api.get<{ saved: boolean }>(`/saved-freelancers/${freelancerId}`);
  }

  save(freelancerId: string): Observable<SavedFreelancer> {
    return this.api.post<SavedFreelancer>(`/saved-freelancers/${freelancerId}`, {});
  }

  unsave(freelancerId: string): Observable<null> {
    return this.api.delete<null>(`/saved-freelancers/${freelancerId}`);
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