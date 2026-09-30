import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BanInfo, FreelancerProfile, User, UserListData } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly api: ApiService) {}

  getProfile(): Observable<User> {
    return this.api.get<User>('/users/profile');
  }

  updateProfile(payload: {
    name?: string;
    bio?: string;
    skills?: string[];
    profileImage?: string;
  }): Observable<User> {
    return this.api.put<User>('/users/profile', payload);
  }

  uploadProfilePhoto(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('photo', file, file.name);
    return this.api.post<User>('/users/profile/photo', formData);
  }

  getFreelancerProfile(): Observable<FreelancerProfile> {
    return this.api.get<FreelancerProfile>('/users/freelancer-profile');
  }

  updateFreelancerProfile(payload: {
    title?: string;
    bio?: string;
    hourlyRate?: number;
    skills?: string[];
  }): Observable<FreelancerProfile> {
    return this.api.put<FreelancerProfile>('/users/freelancer-profile', payload);
  }

  deleteAccount(): Observable<null> {
    return this.api.delete<null>('/users/account');
  }

  getUsers(page = 1, limit = 20): Observable<UserListData> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.api.get<UserListData>('/users/admin/all', params);
  }

  getAdminUser(id: string): Observable<User> {
    return this.api.get<User>(`/users/admin/${id}`);
  }

  /**
   * Suspends an account. The server is the only place a ban is created, and it
   * is never a side effect: it has to be asked for explicitly, by an admin.
   */
  banUser(id: string, durationDays: number, reason: string): Observable<{
    user: User;
    ban: BanInfo;
  }> {
    return this.api.post<{ user: User; ban: BanInfo }>(
      `/users/admin/${id}/ban`,
      { durationDays, reason },
    );
  }

  unbanUser(id: string): Observable<{ user: User }> {
    return this.api.delete<{ user: User }>(`/users/admin/${id}/ban`);
  }

  deleteUserByAdmin(id: string): Observable<null> {
    return this.api.delete<null>(`/users/admin/${id}`);
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }
}