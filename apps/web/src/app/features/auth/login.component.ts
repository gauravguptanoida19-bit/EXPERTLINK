import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Sign in to your ExpertLink account</p>
      </div>

      @if (errorMessage()) {
        <div class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm flex items-start space-x-2">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            formControlName="email"
            placeholder="you@company.com"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Password</label>
          <input
            type="password"
            formControlName="password"
            placeholder="••••••••"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-sm"
          />
        </div>

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-brand-500/20 transition duration-150 flex items-center justify-center space-x-2 text-sm mt-2">
          @if (loading()) {
            <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Signing in...</span>
          } @else {
            <span>Sign In</span>
          }
        </button>
      </form>

      <!-- 1-Click Demo Accounts -->
      <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">1-Click Demo Login</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            (click)="quickLogin('client@expertlink.com', 'Password123!')"
            class="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-center">
            Client
          </button>
          <button
            type="button"
            (click)="quickLogin('expert@expertlink.com', 'Password123!')"
            class="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-center">
            Expert
          </button>
          <button
            type="button"
            (click)="quickLogin('admin@expertlink.com', 'Password123!')"
            class="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-center">
            Admin
          </button>
        </div>
      </div>

      <p class="text-center text-xs text-slate-500 mt-6">
        Don't have an account?
        <a routerLink="/register" class="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Create an account</a>
      </p>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public loading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  public quickLogin(email: string, pass: string): void {
    this.form.patchValue({ email, password: pass });
    this.onSubmit();
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}
