import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { queueDepthGauge } from '../lib/metrics';

export interface JobStatusResponse {
  id: string;
  name: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result?: any;
  failedReason?: string;
  timestamp: number;
}

// In-memory job registry for test mode or offline Redis
class LocalJobRegistry {
  private jobs = new Map<string, JobStatusResponse>();

  setJob(job: JobStatusResponse) {
    this.jobs.set(job.id, job);
  }

  getJob(id: string): JobStatusResponse | undefined {
    return this.jobs.get(id);
  }

  updateProgress(id: string, progress: number) {
    const j = this.jobs.get(id);
    if (j) j.progress = progress;
  }

  completeJob(id: string, result: any) {
    const j = this.jobs.get(id);
    if (j) {
      j.state = 'completed';
      j.progress = 100;
      j.result = result;
    }
  }

  failJob(id: string, reason: string) {
    const j = this.jobs.get(id);
    if (j) {
      j.state = 'failed';
      j.failedReason = reason;
    }
  }

  getCounts() {
    let waiting = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;
    for (const j of this.jobs.values()) {
      if (j.state === 'waiting') waiting++;
      else if (j.state === 'active') active++;
      else if (j.state === 'completed') completed++;
      else if (j.state === 'failed') failed++;
    }
    return { waiting, active, completed, failed, delayed: 0 };
  }
}

export const localJobRegistry = new LocalJobRegistry();

export let matchingQueue: Queue | null = null;
export let dlqQueue: Queue | null = null;

// Initialize BullMQ if Redis is available and not in pure unit test mode
if (env.NODE_ENV !== 'test') {
  try {
    matchingQueue = new Queue('matching-queue', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 100,
        removeOnFail: 200
      }
    });

    dlqQueue = new Queue('matching-dlq', {
      connection: redis
    });
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize BullMQ queues, fallback active');
  }
}

export async function enqueueMatchingJob(data: {
  queryId: string;
  clientId: string;
  queryText: string;
  industry?: string;
  budgetUsd?: number;
}): Promise<string> {
  const jobId = `job_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  localJobRegistry.setJob({
    id: jobId,
    name: 'match-query',
    state: 'active',
    progress: 10,
    timestamp: Date.now()
  });

  if (matchingQueue && redis.status === 'ready') {
    try {
      await matchingQueue.add('match-query', data, { jobId });
    } catch (_) {}
  }

  if (env.NODE_ENV === 'test') {
    try {
      const { matchingService } = await import('../modules/matching/matching.service');
      const result = await matchingService.executeMatchCalculation(data.queryId);
      localJobRegistry.completeJob(jobId, result);
    } catch (_) {}
    return jobId;
  }

  // Execute processing asynchronously in background for dev/prod
  setTimeout(async () => {
    try {
      localJobRegistry.updateProgress(jobId, 30);
      const { matchingService } = await import('../modules/matching/matching.service');
      localJobRegistry.updateProgress(jobId, 60);

      const result = await matchingService.executeMatchCalculation(data.queryId);
      localJobRegistry.completeJob(jobId, result);
    } catch (err: any) {
      localJobRegistry.failJob(jobId, err.message || 'Matching failed');
      logger.error({ jobId, err: err.message }, 'Background matching job failed');
    }
  }, 100);

  return jobId;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
  const local = localJobRegistry.getJob(jobId);
  if (local) {
    return local;
  }

  if (matchingQueue && redis.status === 'ready') {
    try {
      const job = await matchingQueue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        return {
          id: job.id!,
          name: job.name,
          state: state as any,
          progress: typeof job.progress === 'number' ? job.progress : 0,
          result: job.returnvalue,
          failedReason: job.failedReason,
          timestamp: job.timestamp
        };
      }
    } catch (_) {}
  }

  return null;
}

export async function getQueueHealth() {
  if (matchingQueue && redis.status === 'ready') {
    try {
      const counts = await matchingQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      queueDepthGauge.set({ queue_name: 'matching', state: 'waiting' }, counts.waiting);
      queueDepthGauge.set({ queue_name: 'matching', state: 'active' }, counts.active);
      queueDepthGauge.set({ queue_name: 'matching', state: 'failed' }, counts.failed);
      return {
        queue: 'matching-queue',
        status: 'healthy',
        counts
      };
    } catch (_) {}
  }

  const localCounts = localJobRegistry.getCounts();
  return {
    queue: 'matching-queue',
    status: 'healthy',
    mode: 'local-in-memory',
    counts: localCounts
  };
}
