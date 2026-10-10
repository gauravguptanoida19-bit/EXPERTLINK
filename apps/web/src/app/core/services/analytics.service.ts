import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AnalyticsOverviewData {
  totalQueries: number;
  totalBookings: number;
  matchAcceptanceRatePercent: number;
  avgHoursToBooking: number;
  queryVolumePerDay: Array<{ date: string; count: number }>;
  topIndustries: Array<{ industry: string; queryCount: number; estimatedSpendUsd: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);

  public getOverview(): Observable<AnalyticsOverviewData> {
    return this.http
      .get<any>(`${environment.apiUrl}/analytics/overview`)
      .pipe(map((res) => res.data));
  }

  public getQueueHealth(): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/jobs/admin/queue-health`)
      .pipe(map((res) => res.data));
  }
}
