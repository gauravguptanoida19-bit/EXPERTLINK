import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SocketService } from '../../core/realtime/socket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo & Brand -->
        <div class="flex items-center space-x-8">
          <a [routerLink]="authService.isAuthenticated() ? '/dashboard' : '/'" class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
              EL
            </div>
            <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              ExpertLink
            </span>
          </a>

          <!-- Main Nav -->
          @if (authService.isAuthenticated()) {
            <nav class="hidden md:flex items-center space-x-1">
              <a
                routerLink="/dashboard"
                routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Dashboard
              </a>

              @if (authService.userRole() === 'CLIENT' || authService.userRole() === 'ADMIN') {
                <a
                  routerLink="/queries/create"
                  routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                  class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Post Query
                </a>
              }

              <a
                routerLink="/experts/search"
                routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Search Experts
              </a>

              <a
                routerLink="/bookings"
                routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                Bookings
              </a>

              @if (authService.userRole() === 'EXPERT') {
                <a
                  routerLink="/expert/profile"
                  routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                  class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  My Profile
                </a>
              }

              @if (authService.userRole() === 'ADMIN') {
                <a
                  routerLink="/admin/analytics"
                  routerLinkActive="bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                  class="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  Analytics & Queues
                </a>
              }
            </nav>
          }
        </div>

        <!-- Right Side Actions -->
        <div class="flex items-center space-x-3">
          <!-- Dark Mode Toggle -->
          <button
            type="button"
            (click)="authService.toggleDarkMode()"
            class="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle theme">
            @if (authService.darkMode()) {
              <!-- Sun Icon -->
              <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <!-- Moon Icon -->
              <svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          @if (authService.isAuthenticated()) {
            <!-- Notifications Bell -->
            <div class="relative">
              <button
                type="button"
                (click)="showNotifications.set(!showNotifications())"
                class="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                @if (socketService.unreadCount() > 0) {
                  <span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                }
              </button>

              <!-- Notifications Popover -->
              @if (showNotifications()) {
                <div class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                  <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span class="font-semibold text-sm">Notifications</span>
                    <span class="text-xs text-brand-600 dark:text-brand-400 font-medium">{{ socketService.unreadCount() }} unread</span>
                  </div>
                  <div class="max-h-64 overflow-y-auto custom-scrollbar">
                    @for (notif of socketService.notifications(); track notif.id) {
                      <div
                        (click)="socketService.markNotificationAsRead(notif.id)"
                        class="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-50 dark:border-slate-700/20 text-xs">
                        <div class="font-medium text-slate-800 dark:text-slate-200">{{ notif.title }}</div>
                        <div class="text-slate-500 dark:text-slate-400 mt-0.5">{{ notif.message }}</div>
                      </div>
                    } @empty {
                      <div class="p-4 text-center text-xs text-slate-500">No notifications</div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- User Menu -->
            <div class="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div class="text-right hidden sm:block">
                <div class="text-xs font-semibold text-slate-900 dark:text-slate-100">{{ authService.currentUser()?.name }}</div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  {{ authService.currentUser()?.role }}
                </span>
              </div>
              <button
                type="button"
                (click)="authService.logout()"
                class="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                title="Log out">
                Logout
              </button>
            </div>
          } @else {
            <a routerLink="/login" class="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-brand-600 px-3 py-1.5">
              Sign In
            </a>
            <a routerLink="/register" class="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition">
              Get Started
            </a>
          }
        </div>

      </div>
    </header>
  `
})
export class NavbarComponent {
  public authService = inject(AuthService);
  public socketService = inject(SocketService);
  public showNotifications = signal<boolean>(false);
}
