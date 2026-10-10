import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should initialize with no authenticated user if token absent', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should store tokens and set current user on successful login', () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: 'u-1', name: 'Alice Client', email: 'alice@client.com', role: 'CLIENT', createdAt: '2026-01-01' },
        tokens: { accessToken: 'jwt-token-123', refreshToken: 'ref-token-123', expiresIn: '15m' }
      }
    };

    service.login('alice@client.com', 'Password123!').subscribe((res) => {
      expect(res.user.name).toBe('Alice Client');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.role).toBe('CLIENT');
      expect(service.getAccessToken()).toBe('jwt-token-123');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should clear credentials on logout', () => {
    localStorage.setItem('expertlink_access_token', 'sample-token');
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });
});
