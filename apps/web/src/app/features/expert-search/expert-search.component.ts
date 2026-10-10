import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ExpertService } from '../../core/services/expert.service';

@Component({
  selector: 'app-expert-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Expert Network Directory</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore world-class advisors using hybrid semantic & keyword search with Reciprocal Rank Fusion.
        </p>
      </div>

      <!-- Search & Filters -->
      <form [formGroup]="filterForm" (ngSubmit)="search()" class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Search Keywords or Skills (Typo-Tolerant)</label>
            <input
              type="text"
              formControlName="q"
              placeholder="e.g. Distributed systems, LLM fine-tuning, Rust, Stripe..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Industry</label>
            <select
              formControlName="industry"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">All Industries</option>
              <option value="Fintech">Fintech</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="CleanTech">CleanTech</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center space-x-4 text-xs text-slate-500">
            <span>Showing {{ results().length }} experts</span>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/20 transition flex items-center space-x-2">
            @if (loading()) {
              <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Searching...</span>
            } @else {
              <span>Search Experts</span>
            }
          </button>
        </div>
      </form>

      <!-- Facet Summaries if available -->
      @if (facets()) {
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="text-slate-500 font-semibold self-center">Facets:</span>
          @for (f of facets().industries; track f._id) {
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {{ f._id }}: {{ f.count }}
            </span>
          }
        </div>
      }

      <!-- Expert Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (expert of results(); track expert.id || expert.userId) {
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ expert.name || 'Industry Expert' }}</h3>
                  <div class="text-xs text-slate-500 mt-0.5">{{ expert.yearsExperience }} yrs experience • {{ expert.industries?.join(', ') }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-slate-800 dark:text-slate-200">\${{ expert.hourlyRateUsd }}/hr</div>
                  <div class="text-xs text-amber-500">★ {{ expert.rating?.toFixed(1) || '5.0' }}</div>
                </div>
              </div>

              <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                {{ expert.headline }}
              </p>

              <div class="flex flex-wrap gap-1.5 pt-2">
                @for (skill of expert.skills?.slice(0, 5); track skill) {
                  <span class="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ skill }}
                  </span>
                }
              </div>
            </div>

            <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[11px] text-slate-400">Available this week</span>
              <a
                [routerLink]="['/bookings']"
                [queryParams]="{ expertId: expert.userId || expert.id, rate: expert.hourlyRateUsd, name: expert.name }"
                class="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition">
                Book Consultation
              </a>
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <div class="col-span-2 text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p class="text-sm text-slate-500">No experts found matching your criteria.</p>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class ExpertSearchComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expertService = inject(ExpertService);

  public results = signal<any[]>([]);
  public facets = signal<any | null>(null);
  public loading = signal<boolean>(false);

  public filterForm = this.fb.group({
    q: [''],
    industry: ['']
  });

  public ngOnInit(): void {
    this.search();
  }

  public search(): void {
    this.loading.set(true);
    const { q, industry } = this.filterForm.getRawValue();

    this.expertService.searchExpertsHybrid({
      q: q || undefined,
      industry: industry || undefined
    }).subscribe({
      next: (res) => {
        this.results.set(res.experts || res || []);
        this.facets.set(res.facets || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
