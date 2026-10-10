import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ExpertProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExpertService {
  private http = inject(HttpClient);

  public searchExpertsHybrid(params: {
    q?: string;
    industry?: string;
    minRate?: number;
    maxRate?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.industry) httpParams = httpParams.set('industry', params.industry);
    if (params.minRate) httpParams = httpParams.set('minRate', params.minRate.toString());
    if (params.maxRate) httpParams = httpParams.set('maxRate', params.maxRate.toString());

    return this.http
      .get<any>(`${environment.apiUrl}/experts/search/hybrid`, { params: httpParams })
      .pipe(map((res) => res.data));
  }

  public getExpertProfile(userId: string): Observable<ExpertProfile> {
    return this.http
      .get<any>(`${environment.apiUrl}/experts/${userId}`)
      .pipe(map((res) => res.data));
  }

  public updateMyProfile(data: Partial<ExpertProfile>): Observable<ExpertProfile> {
    return this.http
      .put<any>(`${environment.apiUrl}/experts/me`, data)
      .pipe(map((res) => res.data));
  }

  public publishAvailability(slots: Array<{ scheduledAt: string; durationMin: number }>): Observable<any> {
    return this.http
      .post<any>(`${environment.apiUrl}/bookings/availability`, { slots })
      .pipe(map((res) => res.data));
  }

  public getAvailabilitySlots(expertId: string): Observable<any[]> {
    return this.http
      .get<any>(`${environment.apiUrl}/bookings/availability/${expertId}`)
      .pipe(map((res) => res.data));
  }
}
