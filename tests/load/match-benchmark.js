import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const matchLatency = new Trend('match_duration_ms');
const hybridSearchLatency = new Trend('hybrid_search_duration_ms');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '15s', target: 10 }, // Ramp-up to 10 VUs
    { duration: '30s', target: 20 }, // Peak load 20 VUs
    { duration: '15s', target: 0 },  // Ramp-down to 0 VUs
  ],
  thresholds: {
    'http_req_duration': ['p(95)<400'], // 95% of requests under 400ms
    'match_duration_ms': ['p(95)<300'], // ML matching under 300ms (with Redis caching)
    'errors': ['rate<0.01'],            // < 1% error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export function setup() {
  // Pre-seed a test client and query for the benchmark
  const registerPayload = JSON.stringify({
    name: 'Load Tester',
    email: `load_${Date.now()}@expertlink.com`,
    password: 'Password123!',
    role: 'CLIENT',
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  let token = '';
  if (regRes.status === 201) {
    const body = JSON.parse(regRes.body);
    token = body.data.tokens.accessToken;
  } else {
    // Fallback to quick demo login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: 'client@expertlink.com', password: 'Password123!' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (loginRes.status === 200) {
      token = JSON.parse(loginRes.body).data.tokens.accessToken;
    }
  }

  // Create a benchmark query
  let queryId = 'query_bench_01';
  if (token) {
    const qRes = http.post(
      `${BASE_URL}/api/queries`,
      JSON.stringify({
        title: 'k6 High Concurrency Matching Benchmark',
        industry: 'Fintech',
        budgetUsd: 1000,
        description: 'Evaluating concurrent latency of hybrid search and embedding ranker under peak loads',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (qRes.status === 201) {
      queryId = JSON.parse(qRes.body).data.id;
    }
  }

  return { token, queryId };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // 1. Benchmark Hybrid Search Endpoint
  const searchStart = Date.now();
  const searchRes = http.get(
    `${BASE_URL}/api/experts/search/hybrid?q=distributed&industry=Fintech`,
    { headers }
  );
  hybridSearchLatency.add(Date.now() - searchStart);

  const searchSuccess = check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns experts array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data.experts);
      } catch (_) {
        return false;
      }
    },
  });
  if (!searchSuccess) errorRate.add(1);

  // 2. Benchmark Query ML Matching Endpoint (Cached via Redis)
  if (data.queryId) {
    const matchStart = Date.now();
    const matchRes = http.post(
      `${BASE_URL}/api/queries/${data.queryId}/match?sync=true`,
      '{}',
      { headers }
    );
    matchLatency.add(Date.now() - matchStart);

    const matchSuccess = check(matchRes, {
      'match status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    });
    if (!matchSuccess) errorRate.add(1);
  }

  sleep(0.5);
}
