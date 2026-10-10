import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QueryService, QueryItem } from '../../core/services/query.service';
import { BookingService, BookingItem } from '../../core/services/booking.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Client Dashboard
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span class="font-medium text-slate-700 dark:text-slate-300">{{ authService.currentUser()?.name }}</span>. Manage your research queries and expert sessions.
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <a
            routerLink="/queries/create"
            class="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-brand-500/20 transition flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Post New Query</span>
          </a>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Queries</div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white mt-2">{{ queries().length }}</div>
          <div class="text-xs text-slate-400 mt-1">Across all industries</div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Matches</div>
          <div class="text-2xl font-bold text-emerald-600 mt-2">{{ activeMatchesCount() }}</div>
          <div class="text-xs text-slate-400 mt-1">Ready for consultation</div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Bookings</div>
          <div class="text-2xl font-bold text-indigo-600 mt-2">{{ bookings().length }}</div>
          <div class="text-xs text-slate-400 mt-1">Upcoming & completed</div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Consult Mins</div>
          <div class="text-2xl font-bold text-amber-600 mt-2">{{ totalConsultMinutes() }}m</div>
          <div class="text-xs text-slate-400 mt-1">Knowledge gained</div>
        </div>
      </div>

      <!-- Queries Section -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Your Research Queries</h2>
          <a routerLink="/queries/create" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            + Create another
          </a>
        </div>

        @if (loadingQueries()) {
          <div class="p-8 text-center text-sm text-slate-500">Loading your queries...</div>
        } @else if (queries().length === 0) {
          <div class="p-12 text-center">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No queries posted yet</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Post a targeted industry challenge and our ML ranker will immediately source relevant subject matter experts.</p>
            <a routerLink="/queries/create" class="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold">Post your first query</a>
          </div>
        } @else {
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (query of queries(); track query.id) {
              <div class="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div class="space-y-1.5 flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                          [class.bg-emerald-100]="query.status === 'MATCHED'"
                          [class.text-emerald-700]="query.status === 'MATCHED'"
                          [class.bg-blue-100]="query.status === 'OPEN'"
                          [class.text-blue-700]="query.status === 'OPEN'"
                          [class.bg-slate-100]="query.status === 'CLOSED'"
                          [class.text-slate-700]="query.status === 'CLOSED'">
                      {{ query.status }}
                    </span>
                    <span class="text-xs text-slate-400">• {{ query.industry }}</span>
                    <span class="text-xs text-slate-400">• Budget: \${{ query.budgetUsd }}</span>
                  </div>
                  <h3 class="text-sm font-bold text-slate-900 dark:text-white">{{ query.title }}</h3>
                  <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{{ query.description }}</p>
                </div>

                <div class="flex items-center space-x-2 flex-shrink-0">
                  <a
                    [routerLink]="['/queries', query.id, 'matches']"
                    class="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition">
                    View Matches & Ranker
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Recent Bookings Section -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Scheduled Consultations</h2>
          <a routerLink="/bookings" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
            View All
          </a>
        </div>

        @if (loadingBookings()) {
          <div class="p-8 text-center text-sm text-slate-500">Loading bookings...</div>
        } @else if (bookings().length === 0) {
          <div class="p-8 text-center text-xs text-slate-500">
            No consultations scheduled yet. Book an expert from your query match results.
          </div>
        } @else {
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (booking of bookings(); track booking.id) {
              <div class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                          [class.bg-emerald-100]="booking.status === 'CONFIRMED'"
                          [class.text-emerald-700]="booking.status === 'CONFIRMED'"
                          [class.bg-amber-100]="booking.status === 'PENDING'"
                          [class.text-amber-700]="booking.status === 'PENDING'"
                          [class.bg-slate-100]="booking.status === 'COMPLETED'"
                          [class.text-slate-700]="booking.status === 'COMPLETED'">
                      {{ booking.status }}
                    </span>
                    <span class="text-xs text-slate-500">{{ booking.scheduledAt | date:'medium' }}</span>
                  </div>
                  <div class="text-xs font-semibold text-slate-900 dark:text-white">
                    {{ booking.durationMin }} min session • \${{ booking.ratePerHourUsd }}/hr
                  </div>
                </div>
                <div class="text-xs text-slate-500 font-mono">
                  Ref: {{ booking.id.slice(0, 8) }}
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ClientDashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private queryService = inject(QueryService);
  private bookingService = inject(BookingService);

  public queries = signal<QueryItem[]>([]);
  public bookings = signal<BookingItem[]>([]);
  public loadingQueries = signal<boolean>(true);
  public loadingBookings = signal<boolean>(true);

  public activeMatchesCount = signal<number>(0);
  public totalConsultMinutes = signal<number>(0);

  public ngOnInit(): void {
    this.loadQueries();
    this.loadBookings();
  }

  private loadQueries(): void {
    this.queryService.getMyQueries().subscribe({
      next: (list: QueryItem[]) => {
        const queriesList = list || [];
        this.queries.set(queriesList);
        this.activeMatchesCount.set(queriesList.filter((q: QueryItem) => q.status === 'MATCHED').length);
        this.loadingQueries.set(false);
      },
      error: () => this.loadingQueries.set(false)
    });
  }

  private loadBookings(): void {
    this.bookingService.getBookings().subscribe({
      next: (list: BookingItem[]) => {
        const bookingsList = list || [];
        this.bookings.set(bookingsList);
        const mins = bookingsList.reduce((acc: number, b: BookingItem) => acc + (b.durationMin || 0), 0);
        this.totalConsultMinutes.set(mins);
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false)
    });
  }
}
