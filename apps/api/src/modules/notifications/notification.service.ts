import { emitNotification } from '../../realtime/socket';

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'MATCH_FOUND' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'SYSTEM';
  read: boolean;
  metadata?: any;
  createdAt: Date;
}

class InMemoryNotificationStore {
  public notifications: UserNotification[] = [];

  clear() {
    this.notifications = [];
  }
}

export const inMemoryNotificationStore = new InMemoryNotificationStore();

export class NotificationService {
  public createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: UserNotification['type'];
    metadata?: any;
  }): UserNotification {
    const notification: UserNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      metadata: data.metadata,
      createdAt: new Date()
    };

    inMemoryNotificationStore.notifications.unshift(notification);

    // Push live via Socket.IO
    emitNotification(data.userId, notification);

    return notification;
  }

  public getUserNotifications(userId: string): UserNotification[] {
    return inMemoryNotificationStore.notifications.filter((n) => n.userId === userId);
  }

  public markAsRead(id: string, userId: string): boolean {
    const notif = inMemoryNotificationStore.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }
}

export const notificationService = new NotificationService();
