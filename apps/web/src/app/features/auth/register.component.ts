import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create an Account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Join ExpertLink as a Client or Industry Expert</p>
      </div>

      @if (errorMessage()) {
        <div class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm">
          {{ errorMessage() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            formControlName="name"
            placeholder="Dr. Jane Doe"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            formControlName="email"
            placeholder="jane@company.com"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Password (min 8 characters)</label>
          <input
            type="password"
            formControlName="password"
            placeholder="••••••••"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Account Role</label>
          <div class="grid grid-cols-2 gap-3 mt-1">
            <label class="flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition"
                   [class.border-brand-500]="form.get('role')?.value === 'CLIENT'"
                   [class.bg-brand-50]="form.get('role')?.value === 'CLIENT'">
              <input type="radio" formControlName="role" value="CLIENT" class="text-brand-600 focus:ring-brand-500" />
              <div class="text-xs font-medium">
                <div>Client</div>
                <div class="text-slate-400 text-[10px]">Post queries & consult</div>
              </div>
            </label>
            <label class="flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition"
                   [class.border-brand-500]="form.get('role')?.value === 'EXPERT'"
                   [class.bg-brand-50]="form.get('role')?.value === 'EXPERT'">
              <input type="radio" formControlName="role" value="EXPERT" class="text-brand-600 focus:ring-brand-500" />
              <div class="text-xs font-medium">
                <div>Expert</div>
                <div class="text-slate-400 text-[10px]">Provide consultations</div>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-brand-500/20 transition duration-150 flex items-center justify-center space-x-2 text-sm mt-4">
          @if (loading()) {
            <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Creating account...</span>
          } @else {
            <span>Create Account</span>
          }
        </button>
      </form>

      <p class="text-center text-xs text-slate-500 mt-6">
        Already have an account?
        <a routerLink="/login" class="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Sign in</a>
      </p>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public loading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['CLIENT', [Validators.required]]
  });

  public onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    const { name, email, password, role } = this.form.getRawValue();
    this.authService.register({
      name: name!,
      email: email!,
      password: password!,
      role: role as 'CLIENT' | 'EXPERT' | 'ADMIN'
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
