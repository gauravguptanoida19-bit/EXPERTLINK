import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Observer } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export interface MatchProgressEvent {
  userId: string;
  queryId: string;
  step: 'embedding' | 'ranking' | 'done';
  progress: number;
  message: string;
}

export interface BookingUpdateEvent {
  clientId: string;
  expertId: string;
  bookingId: string;
  status: string;
  scheduledAt: string;
  message: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private socket: Socket | null = null;

  public matchProgress = signal<MatchProgressEvent | null>(null);
  public bookingUpdate = signal<BookingUpdateEvent | null>(null);
  public notifications = signal<NotificationItem[]>([]);
  public unreadCount = signal<number>(0);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.connect();
        this.loadNotifications();
      } else {
        this.disconnect();
      }
    });
  }

  public connect() {
    const token = this.authService.getAccessToken();
    if (!token) return;

    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('match:progress', (data: MatchProgressEvent) => {
      this.matchProgress.set(data);
    });

    this.socket.on('booking:update', (data: BookingUpdateEvent) => {
      this.bookingUpdate.set(data);
      this.loadNotifications();
    });

    this.socket.on('notification:new', (notif: NotificationItem) => {
      this.notifications.update((list) => [notif, ...list]);
      this.unreadCount.update((c) => c + 1);
    });
  }

  public onMatchProgress(): Observable<MatchProgressEvent> {
    return new Observable<MatchProgressEvent>((observer: Observer<MatchProgressEvent>) => {
      if (!this.socket) {
        this.connect();
      }
      const handler = (data: MatchProgressEvent) => observer.next(data);
      this.socket?.on('match:progress', handler);
      return () => {
        this.socket?.off('match:progress', handler);
      };
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinQuery(queryId: string) {
    if (this.socket) {
      this.socket.emit('join:query', queryId);
    }
  }

  public loadNotifications() {
    this.http.get<any>(`${environment.apiUrl}/notifications`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.notifications.set(res.data);
          this.unreadCount.set(res.data.filter((n: any) => !n.read).length);
        }
      },
      error: () => {}
    });
  }

  public markNotificationAsRead(id: string) {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      }
    });
  }
}
