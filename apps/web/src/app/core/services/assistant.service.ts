import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StructuredQueryResult {
  title: string;
  industry: string;
  skills: string[];
  seniority: string;
  budgetRecommendationUsd: number;
  suggestedDescription: string;
  clarifyingQuestions: string[];
  source: string;
}

export interface ExpertBriefResult {
  executiveSummary: string;
  recommendedAgenda: Array<{ durationMinutes: number; topic: string; objective: string } | string>;
  potentialPitfallsToExplore: string[];
  relevantExpertHighlights: string[];
  keyQuestions?: string[];
  source: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private http = inject(HttpClient);

  public structureQuery(rawText: string): Observable<StructuredQueryResult> {
    return this.http
      .post<any>(`${environment.apiUrl}/assistant/structure-query`, { rawText })
      .pipe(map((res) => res.data));
  }

  public getExpertBrief(queryId: string, expertId: string): Observable<ExpertBriefResult> {
    return this.http
      .post<any>(`${environment.apiUrl}/assistant/expert-brief`, { queryId, expertId })
      .pipe(map((res) => res.data));
  }

  public generateBrief(params: {
    queryId: string;
    expertId: string;
    queryDescription?: string;
    expertHeadline?: string;
    expertSkills?: string[];
  }): Observable<{ brief: ExpertBriefResult }> {
    return this.getExpertBrief(params.queryId, params.expertId).pipe(
      map((brief) => {
        // Ensure agenda and key questions are nicely structured
        const formattedAgenda = Array.isArray(brief.recommendedAgenda)
          ? brief.recommendedAgenda.map((item: any) => {
              if (typeof item === 'string') {
                return { durationMinutes: 10, topic: item, objective: 'Strategic discussion' };
              }
              return item;
            })
          : [
              { durationMinutes: 10, topic: 'Introduction & Core Context', objective: 'Align on baseline' },
              { durationMinutes: 25, topic: 'Deep Dive & Technical Feasibility', objective: 'Architecture critique' },
              { durationMinutes: 10, topic: 'Actionable Next Steps & Traps', objective: 'Mitigate risk' }
            ];

        return {
          brief: {
            ...brief,
            recommendedAgenda: formattedAgenda,
            keyQuestions: brief.potentialPitfallsToExplore || ['What are the major trade-offs in this approach?']
          }
        };
      })
    );
  }
}
