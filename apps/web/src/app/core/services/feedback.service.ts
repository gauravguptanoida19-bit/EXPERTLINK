import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SuggestionFeedbackPayload {
  queryId: string;
  expertId: string;
  isRelevant: boolean;
  note?: string;
}

export interface ConsultationFeedbackPayload {
  bookingId: string;
  rating: number;
  review?: string;
  outcomeNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/feedback`;

  public rateSuggestion(payload: SuggestionFeedbackPayload): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/suggestion`, payload);
  }

  public submitConsultationFeedback(payload: ConsultationFeedbackPayload): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/consultation`, payload);
  }

  public triggerRetrain(): Observable<{ success: boolean; metrics: any }> {
    return this.http.post<{ success: boolean; metrics: any }>(`${this.apiUrl}/admin/retrain-now`, {});
  }
}
