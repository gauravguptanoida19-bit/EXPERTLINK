import client from 'prom-client';

export const register = new client.Registry();

client.collectDefaultMetrics({ register, prefix: 'expertlink_' });

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'expertlink_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

export const matchDurationHistogram = new client.Histogram({
  name: 'expertlink_match_duration_seconds',
  help: 'Duration of matching calculations in seconds',
  labelNames: ['strategy', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register]
});

export const cacheHitsCounter = new client.Counter({
  name: 'expertlink_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache_key_type'],
  registers: [register]
});

export const cacheMissesCounter = new client.Counter({
  name: 'expertlink_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache_key_type'],
  registers: [register]
});

export const queueDepthGauge = new client.Gauge({
  name: 'expertlink_queue_depth',
  help: 'Current number of jobs in BullMQ queues',
  labelNames: ['queue_name', 'state'],
  registers: [register]
});
