import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent)
  },
  {
    path: 'queries/create',
    canActivate: [authGuard],
    data: { roles: ['CLIENT', 'ADMIN'] },
    loadComponent: () => import('./features/query-create/query-create.component').then(m => m.QueryCreateComponent)
  },
  {
    path: 'queries/:id/matches',
    canActivate: [authGuard],
    loadComponent: () => import('./features/match-results/match-results.component').then(m => m.MatchResultsComponent)
  },
  {
    path: 'experts/search',
    canActivate: [authGuard],
    loadComponent: () => import('./features/expert-search/expert-search.component').then(m => m.ExpertSearchComponent)
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/bookings/booking-flow.component').then(m => m.BookingFlowComponent)
  },
  {
    path: 'expert/profile',
    canActivate: [authGuard],
    data: { roles: ['EXPERT', 'ADMIN'] },
    loadComponent: () => import('./features/expert-profile/expert-profile.component').then(m => m.ExpertProfileComponent)
  },
  {
    path: 'admin/analytics',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin-analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
