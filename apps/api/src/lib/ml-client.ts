import { env } from '../config/env';

export async function checkMlServiceHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${env.ML_SERVICE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { status: 'up', latencyMs: Date.now() - start };
    }
    return { status: 'down', latencyMs: Date.now() - start, error: `Status ${res.status}` };
  } catch (err: any) {
    return { status: 'down', latencyMs: Date.now() - start, error: err.message };
  }
}
