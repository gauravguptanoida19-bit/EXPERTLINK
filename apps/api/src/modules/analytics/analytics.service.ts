import { inMemoryQueryStore } from '../queries/query.repository';
import { inMemoryBookingStore } from '../bookings/booking.repository';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

export interface AnalyticsOverview {
  totalQueries: number;
  totalBookings: number;
  matchAcceptanceRatePercent: number;
  avgHoursToBooking: number;
  queryVolumePerDay: Array<{ date: string; count: number }>;
  topIndustries: Array<{ industry: string; queryCount: number; estimatedSpendUsd: number }>;
}

export class AnalyticsService {
  public async getOverview(): Promise<AnalyticsOverview> {
    const queries = Array.from(inMemoryQueryStore.queries.values());
    const bookings = Array.from(inMemoryBookingStore.bookings.values());

    const totalQueries = queries.length;
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED'
    ).length;

    const matchAcceptanceRatePercent = totalQueries > 0
      ? Number(((confirmedBookings / totalQueries) * 100).toFixed(1))
      : 0;

    // Average time to first booking
    let totalHoursDiff = 0;
    let timedCount = 0;
    for (const b of bookings) {
      const q = inMemoryQueryStore.queries.get(b.queryId);
      if (q) {
        const diffHours = (b.createdAt.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60);
        totalHoursDiff += Math.max(0.1, diffHours);
        timedCount++;
      }
    }
    const avgHoursToBooking = timedCount > 0
      ? Number((totalHoursDiff / timedCount).toFixed(2))
      : 1.5;

    // Group queries by day (last 7 days)
    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, 0);
    }

    for (const q of queries) {
      const key = q.createdAt.toISOString().split('T')[0];
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + 1);
      }
    }

    const queryVolumePerDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Top industries
    const industryStats = new Map<string, { count: number; spend: number }>();
    for (const q of queries) {
      const current = industryStats.get(q.industry) || { count: 0, spend: 0 };
      current.count += 1;
      current.spend += q.budgetUsd;
      industryStats.set(q.industry, current);
    }

    const topIndustries = Array.from(industryStats.entries())
      .map(([industry, stats]) => ({
        industry,
        queryCount: stats.count,
        estimatedSpendUsd: stats.spend
      }))
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 5);

    return {
      totalQueries,
      totalBookings,
      matchAcceptanceRatePercent,
      avgHoursToBooking,
      queryVolumePerDay,
      topIndustries
    };
  }
}

export const analyticsService = new AnalyticsService();
