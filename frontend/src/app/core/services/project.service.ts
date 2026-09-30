import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Dispute,
  Project,
  ProjectListData,
  ProjectQuery,
  ProjectStatus,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private readonly api: ApiService) {}

  getProjects(query: ProjectQuery): Observable<ProjectListData> {
    let params = new HttpParams();
    const setIf = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== null && String(value) !== '') {
        params = params.set(key, String(value));
      }
    };
    setIf('search', query.search);
    setIf('status', query.status);
    setIf('skill', query.skill);
    setIf('minBudget', query.minBudget);
    setIf('maxBudget', query.maxBudget);
    setIf('sortBy', query.sortBy);
    setIf('sortOrder', query.sortOrder);
    setIf('page', query.page ?? 1);
    setIf('limit', query.limit);
    return this.api.get<ProjectListData>('/projects', params);
  }

  getProject(id: string): Observable<Project> {
    return this.api.get<Project>(`/projects/${id}`);
  }

  /**
   * The dispute attached to a project. The server refuses this for anyone who
   * is not a party to it, so a project that is merely marked as disputed still
   * says nothing about the argument behind it to other visitors.
   */
  getProjectDispute(id: string): Observable<{ dispute: Dispute | null }> {
    return this.api.get<{ dispute: Dispute | null }>(`/projects/${id}/dispute`);
  }

  getMyProjects(): Observable<Project[]> {
    return this.api.get<Project[]>('/projects/my');
  }

  createProject(payload: {
    title: string;
    description: string;
    minBudget: number;
    maxBudget: number;
    durationDays: number;
    skills: string[];
  }): Observable<Project> {
    return this.api.post<Project>('/projects', payload);
  }

  updateProject(
    id: string,
    payload: {
      title?: string;
      description?: string;
      minBudget?: number;
      maxBudget?: number;
      durationDays?: number;
      skills?: string[];
    },
  ): Observable<Project> {
    return this.api.put<Project>(`/projects/${id}`, payload);
  }

  deleteProject(id: string): Observable<ProjectStatus | null> {
    return this.api.delete<ProjectStatus | null>(`/projects/${id}`);
  }
}