import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QueryService } from '../../core/services/query.service';
import { SocketService } from '../../core/realtime/socket.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { AssistantService } from '../../core/services/assistant.service';
import { MatchItem, QueryItem } from '../../core/models/user.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Breadcrumb & Title -->
      <div>
        <a routerLink="/dashboard" class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1 mb-2">
          <span>&larr; Back to Dashboard</span>
        </a>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Match & Ranking Engine</span>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {{ query()?.title || 'Expert Matches' }}
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Industry: <span class="font-medium text-slate-700 dark:text-slate-300">{{ query()?.industry }}</span> •
              Budget: <span class="font-medium text-slate-700 dark:text-slate-300">\${{ query()?.budgetUsd }}</span>
            </p>
          </div>

          <button
            type="button"
            (click)="runMatchJob()"
            [disabled]="loadingMatch()"
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Re-run Matcher</span>
          </button>
        </div>
      </div>

      <!-- Live Matching Stepper Progress -->
      @if (loadingMatch()) {
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200 dark:border-brand-900/50 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-brand-500 animate-ping"></span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Live ML Ranking Pipeline</h3>
            </div>
            <span class="text-xs font-mono text-brand-600 dark:text-brand-400 uppercase tracking-wider font-semibold">
              Stage: {{ matchProgressStage() }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              class="bg-gradient-to-r from-brand-600 to-indigo-500 h-full transition-all duration-500 ease-out"
              [style.width.%]="progressPercentage()">
            </div>
          </div>

          <div class="grid grid-cols-3 text-center text-xs mt-3 text-slate-500">
            <div [class.text-brand-600]="progressPercentage() >= 30" [class.font-bold]="progressPercentage() >= 30">1. Generating Embeddings</div>
            <div [class.text-brand-600]="progressPercentage() >= 70" [class.font-bold]="progressPercentage() >= 70">2. ML Ranker Scoring</div>
            <div [class.text-brand-600]="progressPercentage() >= 100" [class.font-bold]="progressPercentage() >= 100">3. Explanations Ready</div>
          </div>
        </div>
      }

      <!-- Match Results Cards -->
      <div class="space-y-6">
        @for (item of matches(); track item.expertId; let idx = $index) {
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
            <!-- Top Row -->
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md shadow-brand-500/20">
                  #{{ idx + 1 }}
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ item.expert.name }}</h3>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold flex items-center space-x-1">
                      <span>★</span>
                      <span>{{ item.expert.rating.toFixed(1) }}</span>
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{{ item.expert.headline }}</p>
                  <div class="text-xs text-slate-400 mt-1">
                    Rate: <span class="font-semibold text-slate-700 dark:text-slate-300">\${{ item.expert.hourlyRateUsd }}/hr</span> •
                    Industries: {{ item.expert.industries.join(', ') }}
                  </div>
                </div>
              </div>

              <!-- Overall Score Badge & Action -->
              <div class="flex md:flex-col items-center md:items-end justify-between gap-3">
                <div class="text-right">
                  <div class="text-xs text-slate-400 font-medium">Match Fit Score</div>
                  <div class="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {{ (item.score * 100).toFixed(0) }}%
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    (click)="openPreCallBrief(item)"
                    class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition">
                    📋 AI Brief
                  </button>
                  <a
                    [routerLink]="['/bookings']"
                    [queryParams]="{ queryId: query()?.id, expertId: item.expertId, rate: item.expert.hourlyRateUsd, name: item.expert.name }"
                    class="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition">
                    Book Call
                  </a>
                </div>
              </div>
            </div>

            <!-- Overlapping Skills Badges -->
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-500">Overlapping Skills:</span>
              @for (skill of item.explanation.matchedSkills; track skill) {
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ {{ skill }}
                </span>
              } @empty {
                <span class="text-xs text-slate-400 italic">Semantic domain match</span>
              }
            </div>

            <!-- "Why This Expert" Explanation Section -->
            <div class="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div class="flex items-start justify-between">
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Why this expert matches your query:
                </div>
                <!-- Feedback Thumbs -->
                <div class="flex items-center space-x-1.5 text-xs text-slate-500">
                  <span>Feedback:</span>
                  <button
                    type="button"
                    (click)="submitSuggestionFeedback(item.expertId, true)"
                    [class.text-emerald-600]="feedbackGiven()[item.expertId] === 'yes'"
                    class="hover:text-emerald-600 p-1 rounded"
                    title="Helpful match">
                    👍
                  </button>
                  <button
                    type="button"
                    (click)="submitSuggestionFeedback(item.expertId, false)"
                    [class.text-red-500]="feedbackGiven()[item.expertId] === 'no'"
                    class="hover:text-red-500 p-1 rounded"
                    title="Not relevant">
                    👎
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {{ item.explanation.summary }}
              </p>

              <!-- Relevant Past Engagements -->
              @if (item.explanation.relevantPastEngagements.length) {
                <div class="mt-2 text-xs text-slate-500">
                  <span class="font-semibold text-slate-600 dark:text-slate-400">Past Engagements: </span>
                  {{ item.explanation.relevantPastEngagements.join('; ') }}
                </div>
              }

              <!-- Sub-Score Breakdown Bars -->
              <div class="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <div class="text-[10px] text-slate-400 uppercase">Semantic Sim</div>
                  <div class="font-bold text-slate-700 dark:text-slate-200">{{ ((item.subScores.semanticSimilarity || 0) * 100).toFixed(0) }}%</div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                    <div class="bg-blue-500 h-full rounded-full" [style.width.%]="(item.subScores.semanticSimilarity || 0) * 100"></div>
                  </div>
                </div>

                <div>
                  <div class="text-[10px] text-slate-400 uppercase">Skills Match</div>
                  <div class="font-bold text-slate-700 dark:text-slate-200">{{ ((item.subScores.skillsOverlap || 0) * 100).toFixed(0) }}%</div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                    <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="(item.subScores.skillsOverlap || 0) * 100"></div>
                  </div>
                </div>

                <div>
                  <div class="text-[10px] text-slate-400 uppercase">Industry Match</div>
                  <div class="font-bold text-slate-700 dark:text-slate-200">{{ ((item.subScores.industryMatch || 0) * 100).toFixed(0) }}%</div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                    <div class="bg-purple-500 h-full rounded-full" [style.width.%]="(item.subScores.industryMatch || 0) * 100"></div>
                  </div>
                </div>

                <div>
                  <div class="text-[10px] text-slate-400 uppercase">Exp & Rating</div>
                  <div class="font-bold text-slate-700 dark:text-slate-200">{{ ((item.subScores.experienceRatingScore || 0) * 100).toFixed(0) }}%</div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                    <div class="bg-amber-500 h-full rounded-full" [style.width.%]="(item.subScores.experienceRatingScore || 0) * 100"></div>
                  </div>
                </div>

                <div>
                  <div class="text-[10px] text-slate-400 uppercase">ML Booking Prob</div>
                  <div class="font-bold text-slate-700 dark:text-slate-200">{{ ((item.subScores.bookingLikelihood || 0) * 100).toFixed(0) }}%</div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                    <div class="bg-rose-500 h-full rounded-full" [style.width.%]="(item.subScores.bookingLikelihood || 0) * 100"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        } @empty {
          @if (!loadingMatch()) {
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No match results yet</h3>
              <p class="text-xs text-slate-500 mt-1 mb-4">Click "Re-run Matcher" above to run the hybrid ML ranking pipeline.</p>
              <button
                type="button"
                (click)="runMatchJob()"
                class="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold">
                Run Match Pipeline
              </button>
            </div>
          }
        }
      </div>

      <!-- Pre-Call Brief Modal -->
      @if (activeBrief()) {
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-brand-600">AI Consultation Briefing</span>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">Pre-Call Brief: {{ selectedExpert()?.expert?.name }}</h3>
              </div>
              <button
                type="button"
                (click)="activeBrief.set(null)"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Executive Summary</h4>
              <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                {{ activeBrief().executiveSummary }}
              </p>
            </div>

            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recommended 45-Min Agenda</h4>
              <div class="space-y-2">
                @for (item of activeBrief().recommendedAgenda; track item.topic) {
                  <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start space-x-3 text-xs">
                    <span class="px-2 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 font-bold font-mono">
                      {{ item.durationMinutes }}m
                    </span>
                    <div>
                      <div class="font-bold text-slate-800 dark:text-slate-200">{{ item.topic }}</div>
                      <div class="text-slate-500 mt-0.5">{{ item.objective }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Questions to Ask</h4>
              <ul class="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1">
                @for (q of activeBrief().keyQuestions; track q) {
                  <li>{{ q }}</li>
                }
              </ul>
            </div>

            <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                (click)="activeBrief.set(null)"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MatchResultsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private queryService = inject(QueryService);
  private socketService = inject(SocketService);
  private feedbackService = inject(FeedbackService);
  private assistantService = inject(AssistantService);

  public queryId = signal<string>('');
  public query = signal<QueryItem | null>(null);
  public matches = signal<MatchItem[]>([]);
  public loadingMatch = signal<boolean>(false);
  public matchProgressStage = signal<string>('idle');
  public progressPercentage = signal<number>(0);

  public activeBrief = signal<any | null>(null);
  public selectedExpert = signal<MatchItem | null>(null);
  public feedbackGiven = signal<Record<string, 'yes' | 'no'>>({});

  private socketSub?: Subscription;

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.queryId.set(id);
      this.loadQuery(id);
      this.setupSocketListener(id);
      this.runMatchJob();
    }
  }

  public ngOnDestroy(): void {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
  }

  private loadQuery(id: string): void {
    this.queryService.getQueryById(id).subscribe({
      next: (q) => {
        this.query.set(q);
        if (q.matches && q.matches.length > 0) {
          this.matches.set(q.matches);
        }
      }
    });
  }

  private setupSocketListener(queryId: string): void {
    this.socketSub = this.socketService.onMatchProgress().subscribe({
      next: (event: any) => {
        if (event.queryId === queryId) {
          const stage = event.step || event.stage || 'embedding';
          this.matchProgressStage.set(stage);
          if (stage === 'embedding') this.progressPercentage.set(35);
          else if (stage === 'ranking') this.progressPercentage.set(70);
          else if (stage === 'done') {
            this.progressPercentage.set(100);
            this.loadingMatch.set(false);
            if (event.matches) {
              this.matches.set(event.matches);
            } else {
              this.loadQuery(queryId);
            }
          }
        }
      }
    });
  }

  public runMatchJob(): void {
    const id = this.queryId();
    if (!id) return;

    this.loadingMatch.set(true);
    this.matchProgressStage.set('embedding');
    this.progressPercentage.set(20);

    this.queryService.triggerMatch(id).subscribe({
      next: (res) => {
        // If immediate matches returned
        if ((res as any).data && Array.isArray((res as any).data)) {
          this.matches.set((res as any).data);
          this.progressPercentage.set(100);
          this.loadingMatch.set(false);
        } else if (res.jobId) {
          // Poll fallback in case socket is delayed
          this.pollJob(res.jobId, id);
        }
      },
      error: () => {
        this.loadingMatch.set(false);
      }
    });
  }

  private pollJob(jobId: string, queryId: string, attempts = 0): void {
    if (attempts > 15 || !this.loadingMatch()) return;

    setTimeout(() => {
      this.queryService.getJobStatus(jobId).subscribe({
        next: (status) => {
          if (status.status === 'completed' && status.result) {
            this.matches.set(status.result.matches || status.result);
            this.progressPercentage.set(100);
            this.loadingMatch.set(false);
          } else {
            this.progressPercentage.set(Math.min(85, 30 + attempts * 5));
            this.pollJob(jobId, queryId, attempts + 1);
          }
        },
        error: () => {
          this.loadingMatch.set(false);
        }
      });
    }, 1000);
  }

  public submitSuggestionFeedback(expertId: string, isRelevant: boolean): void {
    const qId = this.queryId();
    this.feedbackService.rateSuggestion({
      queryId: qId,
      expertId,
      isRelevant
    }).subscribe({
      next: () => {
        const cur = { ...this.feedbackGiven() };
        cur[expertId] = isRelevant ? 'yes' : 'no';
        this.feedbackGiven.set(cur);
      }
    });
  }

  public openPreCallBrief(item: MatchItem): void {
    this.selectedExpert.set(item);
    const q = this.query();
    this.assistantService.generateBrief({
      expertId: item.expertId,
      queryId: q?.id || this.queryId(),
      queryDescription: q?.description || q?.title || 'Expert Consultation',
      expertHeadline: item.expert.headline,
      expertSkills: item.expert.skills
    }).subscribe({
      next: (res: any) => {
        this.activeBrief.set(res.brief);
      }
    });
  }
}
