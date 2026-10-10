import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { QueryItem } from '../models/user.model';
import { environment } from '../../../environments/environment';

export type { QueryItem } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  private http = inject(HttpClient);

  public createQuery(data: {
    title: string;
    description: string;
    industry: string;
    budgetUsd: number;
  }): Observable<QueryItem> {
    return this.http
      .post<any>(`${environment.apiUrl}/queries`, data)
      .pipe(map((res) => res.data));
  }

  public getMyQueries(): Observable<QueryItem[]> {
    return this.http
      .get<any>(`${environment.apiUrl}/queries`)
      .pipe(map((res) => res.data));
  }

  public getQueryById(id: string): Observable<QueryItem> {
    return this.http
      .get<any>(`${environment.apiUrl}/queries/${id}`)
      .pipe(map((res) => res.data));
  }

  public triggerMatch(queryId: string): Observable<{ jobId: string; statusUrl: string }> {
    return this.http
      .post<any>(`${environment.apiUrl}/queries/${queryId}/match`, {})
      .pipe(map((res) => res));
  }

  public getJobStatus(jobId: string): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/jobs/${jobId}`)
      .pipe(map((res) => res.data));
  }
}
