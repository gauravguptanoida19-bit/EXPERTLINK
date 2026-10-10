import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QueryService } from '../../core/services/query.service';
import { AssistantService } from '../../core/services/assistant.service';

@Component({
  selector: 'app-query-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto space-y-8">
      <div>
        <a routerLink="/dashboard" class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1 mb-2">
          <span>&larr; Back to Dashboard</span>
        </a>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Post Research Query</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Describe the challenge or decision your team is facing. Our ML ranker will source and rank top industry experts.
        </p>
      </div>

      <!-- AI Assistant Banner -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/40 border border-brand-200 dark:border-brand-900/40">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-600 text-white uppercase tracking-wider">AI Copilot</span>
              <h3 class="text-sm font-bold text-brand-900 dark:text-brand-200">Need help framing your question?</h3>
            </div>
            <p class="text-xs text-brand-700 dark:text-brand-300">
              Type rough notes or a vague problem below. Our AI Assistant will convert it into a structured query with industry classification and suggested clarifying questions.
            </p>
          </div>
          <button
            type="button"
            (click)="triggerAiAssistant()"
            [disabled]="loadingAi()"
            class="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition flex-shrink-0 flex items-center space-x-1.5">
            @if (loadingAi()) {
              <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Refining...</span>
            } @else {
              <span>✨ Enhance with AI</span>
            }
          </button>
        </div>

        @if (clarifyingQuestions().length > 0) {
          <div class="mt-4 pt-3 border-t border-brand-200/50 dark:border-brand-900/50 space-y-2">
            <div class="text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300">Suggested Clarifying Questions:</div>
            <div class="flex flex-wrap gap-2">
              @for (q of clarifyingQuestions(); track q) {
                <button
                  type="button"
                  (click)="appendClarification(q)"
                  class="text-left text-xs bg-white dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-900/50 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-200 transition">
                  + {{ q }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Main Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
        @if (errorMessage()) {
          <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            {{ errorMessage() }}
          </div>
        }

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Query Title</label>
          <input
            type="text"
            formControlName="title"
            placeholder="e.g. AI Agents in FinTech: Core Infrastructure Benchmarking"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Industry</label>
            <select
              formControlName="industry"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
              <option value="Fintech">Fintech</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Healthcare">Healthcare & BioTech</option>
              <option value="CleanTech">CleanTech & Energy</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Enterprise SaaS">Enterprise SaaS</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Budget (USD)</label>
            <input
              type="number"
              formControlName="budgetUsd"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Detailed Description & Research Goals</label>
          <textarea
            rows="6"
            formControlName="description"
            placeholder="Specify your technical context, current architecture, questions you want answered, and desired expert background..."
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
          </textarea>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
          <a routerLink="/dashboard" class="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800">
            Cancel
          </a>
          <button
            type="submit"
            [disabled]="form.invalid || loadingSubmit()"
            class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/20 transition flex items-center space-x-2">
            @if (loadingSubmit()) {
              <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Posting & Matching...</span>
            } @else {
              <span>Submit & Run Matcher</span>
            }
          </button>
        </div>
      </form>
    </div>
  `
})
export class QueryCreateComponent {
  private fb = inject(FormBuilder);
  private queryService = inject(QueryService);
  private assistantService = inject(AssistantService);
  private router = inject(Router);

  public loadingSubmit = signal<boolean>(false);
  public loadingAi = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public clarifyingQuestions = signal<string[]>([]);

  public form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    industry: ['Fintech', [Validators.required]],
    budgetUsd: [500, [Validators.required, Validators.min(50)]],
    description: ['', [Validators.required, Validators.minLength(20)]]
  });

  public triggerAiAssistant(): void {
    const raw = this.form.get('description')?.value || this.form.get('title')?.value;
    if (!raw || raw.trim().length < 5) {
      this.errorMessage.set('Please write a few words in the title or description before asking AI to enhance.');
      return;
    }

    this.loadingAi.set(true);
    this.errorMessage.set(null);

    this.assistantService.structureQuery(raw).subscribe({
      next: (res) => {
        if (res.title) this.form.patchValue({ title: res.title });
        if (res.industry) this.form.patchValue({ industry: res.industry });
        if (res.suggestedDescription) this.form.patchValue({ description: res.suggestedDescription });
        if (res.clarifyingQuestions?.length) {
          this.clarifyingQuestions.set(res.clarifyingQuestions);
        }
        this.loadingAi.set(false);
      },
      error: () => {
        this.loadingAi.set(false);
        this.errorMessage.set('AI assistant was unable to enhance right now. You can continue manually.');
      }
    });
  }

  public appendClarification(q: string): void {
    const current = this.form.get('description')?.value || '';
    this.form.patchValue({
      description: `${current}\n\n• Key question: ${q}`
    });
    this.clarifyingQuestions.set(this.clarifyingQuestions().filter(item => item !== q));
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    this.loadingSubmit.set(true);
    this.errorMessage.set(null);

    const val = this.form.getRawValue();
    this.queryService.createQuery({
      title: val.title!,
      industry: val.industry!,
      budgetUsd: Number(val.budgetUsd),
      description: val.description!
    }).subscribe({
      next: (res) => {
        this.loadingSubmit.set(false);
        const queryId = res.id;
        // Redirect directly to match results
        this.router.navigate(['/queries', queryId, 'matches']);
      },
      error: (err) => {
        this.loadingSubmit.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to submit query. Please try again.');
      }
    });
  }
}
