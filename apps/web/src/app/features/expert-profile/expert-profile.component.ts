import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpertService } from '../../core/services/expert.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-expert-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Expert Portal</span>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">Expert Profile & Availability</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Keep your bio, skills, and rates up to date. Updating your profile triggers vector re-indexing for the ML ranker.
          </p>
        </div>
      </div>

      @if (successMessage()) {
        <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <span>✓</span>
          <span>{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {{ errorMessage() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="saveProfile()" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Professional Headline</label>
          <input
            type="text"
            formControlName="headline"
            placeholder="e.g. Principal Architect | Distributed Consensus & High-Throughput Trading Engines"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Years of Experience</label>
            <input
              type="number"
              formControlName="yearsExperience"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Hourly Rate (USD)</label>
            <input
              type="number"
              formControlName="hourlyRateUsd"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Industries (comma-separated)</label>
          <input
            type="text"
            formControlName="industries"
            placeholder="Fintech, Artificial Intelligence, High-Frequency Trading"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Core Technical & Advisory Skills (comma-separated)</label>
          <input
            type="text"
            formControlName="skills"
            placeholder="Kubernetes, Kafka, Rust, Microservices, System Architecture, AWS"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Detailed Bio</label>
          <textarea
            rows="5"
            formControlName="bio"
            placeholder="Provide a comprehensive summary of your background, past leadership roles, and areas where you advise clients..."
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          </textarea>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="text-xs text-slate-400">
            Auto-generates 384-dimensional dense semantic embedding on save.
          </div>
          <button
            type="submit"
            [disabled]="form.invalid || saving()"
            class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/20 transition flex items-center space-x-2">
            @if (saving()) {
              <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Re-generating Vector Embedding...</span>
            } @else {
              <span>Save & Re-Index Profile</span>
            }
          </button>
        </div>
      </form>
    </div>
  `
})
export class ExpertProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expertService = inject(ExpertService);
  private authService = inject(AuthService);

  public saving = signal<boolean>(false);
  public successMessage = signal<string | null>(null);
  public errorMessage = signal<string | null>(null);

  public form = this.fb.group({
    headline: ['', [Validators.required, Validators.minLength(5)]],
    bio: ['', [Validators.required, Validators.minLength(20)]],
    yearsExperience: [10, [Validators.required, Validators.min(0)]],
    hourlyRateUsd: [350, [Validators.required, Validators.min(50)]],
    industries: ['Fintech, Artificial Intelligence', [Validators.required]],
    skills: ['Kubernetes, Distributed Systems, Python, Node.js', [Validators.required]]
  });

  public ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user?.id) {
      this.expertService.getExpertProfile(user.id).subscribe({
        next: (profile) => {
          if (profile) {
            this.form.patchValue({
              headline: profile.headline,
              bio: profile.bio,
              yearsExperience: profile.yearsExperience,
              hourlyRateUsd: profile.hourlyRateUsd,
              industries: profile.industries?.join(', ') || '',
              skills: profile.skills?.join(', ') || ''
            });
          }
        },
        error: () => {
          // New profile, defaults ok
        }
      });
    }
  }

  public saveProfile(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const val = this.form.getRawValue();
    const payload = {
      headline: val.headline!,
      bio: val.bio!,
      yearsExperience: Number(val.yearsExperience),
      hourlyRateUsd: Number(val.hourlyRateUsd),
      industries: val.industries!.split(',').map(s => s.trim()).filter(Boolean),
      skills: val.skills!.split(',').map(s => s.trim()).filter(Boolean)
    };

    this.expertService.updateMyProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Profile updated successfully! 384-dimensional vector embedding re-generated and indexed.');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to update profile.');
      }
    });
  }
}
