import { prisma, tryPrisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { BookingStatus } from '@prisma/client';
import { ConflictError } from '../../middleware/error-handler';

export interface BookingRecord {
  id: string;
  queryId: string;
  expertId: string;
  clientId: string;
  scheduledAt: Date;
  durationMin: number;
  status: BookingStatus;
  ratePerHourUsd: number;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlotRecord {
  id: string;
  expertId: string;
  scheduledAt: Date;
  durationMin: number;
  isBooked: boolean;
  createdAt: Date;
}

export const INITIAL_DEMO_BOOKINGS: BookingRecord[] = [
  {
    id: 'booking_demo_001',
    queryId: 'query_demo_001',
    expertId: 'demo-expert-id-001',
    clientId: 'demo-client-id-001',
    scheduledAt: new Date(Date.now() + 86400000), // tomorrow
    durationMin: 60,
    status: 'CONFIRMED',
    ratePerHourUsd: 450,
    idempotencyKey: 'idem_demo_001',
    createdAt: new Date('2026-01-02T12:00:00Z'),
    updatedAt: new Date('2026-01-02T12:00:00Z')
  }
];

class InMemoryBookingStore {
  public bookings = new Map<string, BookingRecord>();
  public idempotencyKeys = new Map<string, BookingRecord>();
  public expertTimeSlots = new Set<string>(); // "expertId:ISOString"
  public availabilitySlots = new Map<string, AvailabilitySlotRecord>();

  constructor() {
    this.seedDemoBookings();
  }

  public seedDemoBookings() {
    for (const b of INITIAL_DEMO_BOOKINGS) {
      this.bookings.set(b.id, { ...b });
      const slotKey = `${b.expertId}:${b.scheduledAt.toISOString()}`;
      this.expertTimeSlots.add(slotKey);
    }
  }

  clear() {
    this.bookings.clear();
    this.idempotencyKeys.clear();
    this.expertTimeSlots.clear();
    this.availabilitySlots.clear();
  }
}

export const inMemoryBookingStore = new InMemoryBookingStore();

export const bookingRepository = {
  async findByIdempotencyKey(key: string): Promise<BookingRecord | null> {
    const mem = inMemoryBookingStore.idempotencyKeys.get(key);
    if (mem) return mem;

    if (env.NODE_ENV !== 'test') {
      return tryPrisma(
        async () => {
          return await prisma.booking.findUnique({
            where: { idempotencyKey: key }
          });
        },
        () => null
      );
    }
    return null;
  },

  async createBooking(data: {
    queryId: string;
    expertId: string;
    clientId: string;
    scheduledAt: Date;
    durationMin: number;
    ratePerHourUsd: number;
    idempotencyKey?: string | null;
  }): Promise<BookingRecord> {
    const slotKey = `${data.expertId}:${data.scheduledAt.toISOString()}`;

    // Concurrency / double-booking check
    if (inMemoryBookingStore.expertTimeSlots.has(slotKey)) {
      throw new ConflictError(
        `Expert '${data.expertId}' is already booked for slot ${data.scheduledAt.toISOString()}`
      );
    }

    const record: BookingRecord = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      queryId: data.queryId,
      expertId: data.expertId,
      clientId: data.clientId,
      scheduledAt: data.scheduledAt,
      durationMin: data.durationMin,
      status: 'PENDING',
      ratePerHourUsd: data.ratePerHourUsd,
      idempotencyKey: data.idempotencyKey || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Lock slot
    inMemoryBookingStore.expertTimeSlots.add(slotKey);
    inMemoryBookingStore.bookings.set(record.id, record);

    if (data.idempotencyKey) {
      inMemoryBookingStore.idempotencyKeys.set(data.idempotencyKey, record);
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          return await prisma.$transaction(async (tx) => {
            const conflict = await tx.booking.findUnique({
              where: {
                uq_expert_scheduled_at: {
                  expertId: data.expertId,
                  scheduledAt: data.scheduledAt
                }
              }
            });
            if (conflict && conflict.status !== 'CANCELLED') {
              throw new ConflictError('Expert is already booked for this scheduled slot');
            }

            return await tx.booking.create({ data: record });
          });
        },
        () => record
      );
    }

    return record;
  },

  async findById(id: string): Promise<BookingRecord | null> {
    const mem = inMemoryBookingStore.bookings.get(id);
    if (mem) return mem;

    if (env.NODE_ENV !== 'test') {
      return tryPrisma(
        async () => {
          return await prisma.booking.findUnique({ where: { id } });
        },
        () => null
      );
    }
    return null;
  },

  async listBookings(filters: { userId: string; role: string; status?: BookingStatus }): Promise<BookingRecord[]> {
    if (inMemoryBookingStore.bookings.size === 0 && env.NODE_ENV !== 'test') {
      inMemoryBookingStore.seedDemoBookings();
    }

    let all = Array.from(inMemoryBookingStore.bookings.values());

    if (filters.role === 'CLIENT') {
      all = all.filter((b) => b.clientId === filters.userId);
    } else if (filters.role === 'EXPERT') {
      all = all.filter((b) => b.expertId === filters.userId);
    }

    if (filters.status) {
      all = all.filter((b) => b.status === filters.status);
    }

    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async updateStatus(id: string, status: BookingStatus): Promise<BookingRecord | null> {
    const b = inMemoryBookingStore.bookings.get(id);
    if (b) {
      b.status = status;
      b.updatedAt = new Date();

      if (status === 'CANCELLED') {
        const slotKey = `${b.expertId}:${b.scheduledAt.toISOString()}`;
        inMemoryBookingStore.expertTimeSlots.delete(slotKey);
      }
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          return await prisma.booking.update({
            where: { id },
            data: { status }
          });
        },
        () => b || null
      );
    }

    return b || null;
  },

  async publishAvailabilitySlots(expertId: string, slots: Array<{ scheduledAt: Date; durationMin: number }>) {
    const created: AvailabilitySlotRecord[] = [];
    for (const slot of slots) {
      const rec: AvailabilitySlotRecord = {
        id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        expertId,
        scheduledAt: slot.scheduledAt,
        durationMin: slot.durationMin,
        isBooked: false,
        createdAt: new Date()
      };
      inMemoryBookingStore.availabilitySlots.set(rec.id, rec);
      created.push(rec);
    }
    return created;
  },

  async getAvailableSlots(expertId: string): Promise<AvailabilitySlotRecord[]> {
    const slots = Array.from(inMemoryBookingStore.availabilitySlots.values())
      .filter((s) => s.expertId === expertId && !s.isBooked);
    return slots;
  },

  async expireOldPendingBookings(hoursThreshold = 24): Promise<number> {
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    let expiredCount = 0;

    for (const b of inMemoryBookingStore.bookings.values()) {
      if (b.status === 'PENDING' && b.createdAt < cutoff) {
        b.status = 'CANCELLED';
        b.updatedAt = new Date();
        const slotKey = `${b.expertId}:${b.scheduledAt.toISOString()}`;
        inMemoryBookingStore.expertTimeSlots.delete(slotKey);
        expiredCount++;
      }
    }

    if (env.NODE_ENV !== 'test') {
      await tryPrisma(
        async () => {
          const res = await prisma.booking.updateMany({
            where: {
              status: 'PENDING',
              createdAt: { lt: cutoff }
            },
            data: { status: 'CANCELLED' }
          });
          return res.count;
        },
        () => expiredCount
      );
    }

    return expiredCount;
  }
};

