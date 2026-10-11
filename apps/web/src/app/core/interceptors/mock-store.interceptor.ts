import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError, delay, catchError } from 'rxjs';
import { mockStore, isGitHubPagesHost } from '../services/mock-store';

function handleMockRequest(req: HttpRequest<unknown>) {
  const url = req.url;
  const method = req.method;
  const body = req.body as any;

  // Extract auth user ID from token header if present
  let authUserId = 'demo-client-id-001';
  let authRole = 'CLIENT';
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer mock_jwt_token_')) {
    try {
      const payloadStr = atob(authHeader.replace('Bearer mock_jwt_token_', ''));
      const parsed = JSON.parse(payloadStr);
      authUserId = parsed.userId || authUserId;
      authRole = parsed.role || authRole;
    } catch (_) {}
  }

  try {
    // 1. Auth Login
    if (url.includes('/auth/login') && method === 'POST') {
      const res = mockStore.login(body.email, body.password);
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(150));
    }

    // 2. Auth Register
    if (url.includes('/auth/register') && method === 'POST') {
      const res = mockStore.register(body);
      return of(new HttpResponse({ status: 201, body: { success: true, data: res } })).pipe(delay(150));
    }

    // 3. Auth Refresh
    if (url.includes('/auth/refresh') && method === 'POST') {
      const res = {
        accessToken: 'mock_jwt_token_' + btoa(JSON.stringify({ userId: authUserId, role: authRole })),
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresIn: '15m'
      };
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
    }

    // 4. Auth Logout
    if (url.includes('/auth/logout') && method === 'POST') {
      return of(new HttpResponse({ status: 200, body: { success: true } })).pipe(delay(50));
    }

    // 5. Experts Hybrid Search
    if (url.includes('/experts/search/hybrid') && method === 'GET') {
      const query = req.params.get('q') || '';
      const industry = req.params.get('industry') || undefined;
      const res = mockStore.searchExpertsHybrid({ q: query, industry });
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(150));
    }

    // 6. Experts List
    if (url.endsWith('/experts') && method === 'GET') {
      const search = req.params.get('search') || undefined;
      const industry = req.params.get('industry') || undefined;
      const res = mockStore.getExperts({ search, industry });
      return of(new HttpResponse({ status: 200, body: { success: true, data: res.items, pagination: res } })).pipe(delay(100));
    }

    // 7. Expert Profile Me (GET/PUT)
    if (url.endsWith('/experts/me')) {
      if (method === 'GET') {
        const res = mockStore.getExpertById(authUserId);
        return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
      }
      if (method === 'PUT') {
        const res = mockStore.updateExpertProfile(authUserId, body);
        return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(200));
      }
    }

    // 8. Expert Profile by ID
    const expertMatch = url.match(/\/experts\/([a-zA-Z0-9_-]+)$/);
    if (expertMatch && method === 'GET') {
      const id = expertMatch[1];
      const res = mockStore.getExpertById(id);
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
    }

    // 9. Queries List / Create
    if (url.endsWith('/queries')) {
      if (method === 'GET') {
        const res = mockStore.getQueries(authUserId);
        return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
      }
      if (method === 'POST') {
        const res = mockStore.createQuery(body, authUserId);
        return of(new HttpResponse({ status: 201, body: { success: true, data: res } })).pipe(delay(200));
      }
    }

    // 10. Query Trigger Match
    const matchTriggerRegex = /\/queries\/([a-zA-Z0-9_-]+)\/match/;
    if (matchTriggerRegex.test(url) && method === 'POST') {
      const queryId = url.match(matchTriggerRegex)![1];
      const res = mockStore.matchQuery(queryId);
      return of(new HttpResponse({ status: 200, body: { success: true, jobId: res.jobId, statusUrl: res.statusUrl, data: res.data } })).pipe(delay(350));
    }

    // 11. Query by ID
    const queryMatch = url.match(/\/queries\/([a-zA-Z0-9_-]+)$/);
    if (queryMatch && method === 'GET') {
      const id = queryMatch[1];
      const res = mockStore.getQueryById(id);
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
    }

    // 12. Jobs Status
    const jobMatch = url.match(/\/jobs\/([a-zA-Z0-9_-]+)$/);
    if (jobMatch && method === 'GET') {
      const jobId = jobMatch[1];
      const res = mockStore.getJobStatus(jobId);
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
    }

    // 13. Bookings List / Create
    if (url.endsWith('/bookings')) {
      if (method === 'GET') {
        const res = mockStore.getBookings(authUserId, authRole);
        return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(100));
      }
      if (method === 'POST') {
        const res = mockStore.createBooking(body, authUserId);
        return of(new HttpResponse({ status: 201, body: { success: true, data: res } })).pipe(delay(200));
      }
    }

    // 14. Booking Status Update
    const bookingStatusMatch = url.match(/\/bookings\/([a-zA-Z0-9_-]+)\/status/);
    if (bookingStatusMatch && method === 'PATCH') {
      const bId = bookingStatusMatch[1];
      const res = mockStore.updateBookingStatus(bId, body.status);
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(150));
    }

    // 15. Analytics Overview
    if (url.includes('/analytics/overview') && method === 'GET') {
      const res = mockStore.getAnalytics();
      return of(new HttpResponse({ status: 200, body: { success: true, data: res } })).pipe(delay(150));
    }

    // 16. Assistant
    if (url.includes('/assistant/structure-query') && method === 'POST') {
      const res = mockStore.structureQuery(body.rawText);
      return of(new HttpResponse({ status: 200, body: { success: true, ...res } })).pipe(delay(300));
    }
    if (url.includes('/assistant/expert-brief') && method === 'POST') {
      const res = mockStore.expertBrief(body);
      return of(new HttpResponse({ status: 200, body: { success: true, ...res } })).pipe(delay(300));
    }

    // 17. Feedback
    if (url.includes('/feedback') && method === 'POST') {
      return of(new HttpResponse({ status: 201, body: { success: true, message: 'Feedback recorded' } })).pipe(delay(100));
    }
  } catch (err: any) {
    return throwError(() => new HttpErrorResponse({ status: 400, error: { message: err.message || 'Error' } }));
  }

  return of(new HttpResponse({ status: 200, body: { success: true, data: null } }));
}

export const mockStoreInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Always handle directly if running on GitHub Pages
  if (isGitHubPagesHost()) {
    return handleMockRequest(req);
  }

  // Otherwise, attempt real backend call with fallback on connection error (e.g. status 0)
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 0 || err.status === 504)) {
        return handleMockRequest(req);
      }
      return throwError(() => err);
    })
  );
};
