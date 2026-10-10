import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError, map } from 'rxjs';
import { User, AuthResponse, AuthTokens, Role } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  public currentUser = signal<User | null>(null);
  public isAuthenticated = computed(() => !!this.currentUser());
  public userRole = computed(() => this.currentUser()?.role || null);
  public darkMode = signal<boolean>(false);

  private readonly ACCESS_TOKEN_KEY = 'expertlink_access_token';
  private readonly REFRESH_TOKEN_KEY = 'expertlink_refresh_token';
  private readonly USER_KEY = 'expertlink_user';
  private readonly DARK_MODE_KEY = 'expertlink_dark_mode';

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage() {
    // Restore dark mode
    const isDark = localStorage.getItem(this.DARK_MODE_KEY) === 'true';
    this.setDarkMode(isDark);

    // Restore user
    const storedUser = localStorage.getItem(this.USER_KEY);
    const token = this.getAccessToken();
    if (storedUser && token) {
      try {
        this.currentUser.set(JSON.parse(storedUser));
      } catch (_) {}
    }
  }

  public getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  public login(emailOrCreds: string | { email: string; password: string }, maybePassword?: string): Observable<AuthResponse> {
    const payload = typeof emailOrCreds === 'string'
      ? { email: emailOrCreds, password: maybePassword! }
      : emailOrCreds;
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${environment.apiUrl}/auth/login`, payload).pipe(
      map((res) => res.data),
      tap((data) => {
        if (data) {
          this.setSession(data);
        }
      })
    );
  }

  public register(payload: { name: string; email: string; password: string; role: Role }): Observable<AuthResponse> {
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${environment.apiUrl}/auth/register`, payload).pipe(
      map((res) => res.data),
      tap((data) => {
        if (data) {
          this.setSession(data);
        }
      })
    );
  }

  public refreshToken(): Observable<AuthTokens> {
    const rawRefreshToken = this.getRefreshToken();
    if (!rawRefreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken: rawRefreshToken }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(this.REFRESH_TOKEN_KEY, res.data.refreshToken);
        }
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  public logout() {
    const rawRefreshToken = this.getRefreshToken();
    if (rawRefreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: rawRefreshToken }).subscribe({
        error: () => {}
      });
    }

    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(authData: AuthResponse) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, authData.tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.tokens.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
    this.currentUser.set(authData.user);
  }

  public toggleDarkMode() {
    this.setDarkMode(!this.darkMode());
  }

  private setDarkMode(enable: boolean) {
    this.darkMode.set(enable);
    localStorage.setItem(this.DARK_MODE_KEY, String(enable));
    if (enable) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
