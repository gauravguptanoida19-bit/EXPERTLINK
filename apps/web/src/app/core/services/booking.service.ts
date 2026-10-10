import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BookingItem } from '../models/user.model';
import { environment } from '../../../environments/environment';

export type { BookingItem } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private http = inject(HttpClient);

  public createBooking(
    data: {
      queryId: string;
      expertId: string;
      scheduledAt: string;
      durationMin: number;
      ratePerHourUsd: number;
    },
    idempotencyKey?: string
  ): Observable<BookingItem> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return this.http
      .post<any>(`${environment.apiUrl}/bookings`, data, { headers })
      .pipe(map((res) => res.data));
  }

  public getBookings(status?: string): Observable<BookingItem[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.http
      .get<any>(`${environment.apiUrl}/bookings`, { params })
      .pipe(map((res) => res.data));
  }

  public updateStatus(bookingId: string, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'): Observable<BookingItem> {
    return this.http
      .patch<any>(`${environment.apiUrl}/bookings/${bookingId}/status`, { status })
      .pipe(map((res) => res.data));
  }
}
