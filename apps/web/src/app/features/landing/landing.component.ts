import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-24 py-6">
      <!-- Hero Section -->
      <section class="relative overflow-hidden text-center pt-8 pb-12 sm:pt-16 sm:pb-20">
        <!-- Ambient background glow -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-500/20 to-indigo-500/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6">
          <span class="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
          <span>Next-Generation Expert Network Platform</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Connect with vetted industry leaders using <span class="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-500">Machine Learning</span>
        </h1>

        <p class="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Post complex research queries and let our hybrid vector ranker surface top subject matter experts with transparent match explanations and seamless booking.
        </p>

        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          @if (authService.isAuthenticated()) {
            <a
              routerLink="/dashboard"
              class="w-full sm:w-auto px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition duration-150 flex items-center justify-center space-x-2 text-sm">
              <span>Go to Dashboard &rarr;</span>
            </a>
            <a
              routerLink="/queries/create"
              class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition duration-150 text-sm">
              Post a Research Query
            </a>
          } @else {
            <a
              routerLink="/register"
              class="w-full sm:w-auto px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition duration-150 flex items-center justify-center space-x-2 text-sm">
              <span>Get Started Free</span>
            </a>
            <a
              routerLink="/login"
              class="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition duration-150 text-sm">
              Explore Demo Logins
            </a>
          }
        </div>

        <!-- Metric highlights -->
        <div class="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">384-Dim</div>
            <div class="text-xs text-slate-500 mt-0.5">Dense Vector Embeddings</div>
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-black text-brand-600 dark:text-brand-400">&lt; 3.6ms</div>
            <div class="text-xs text-slate-500 mt-0.5">Cached Match Retrieval</div>
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-black text-emerald-600">RRF k=60</div>
            <div class="text-xs text-slate-500 mt-0.5">Hybrid Reciprocal Rank Fusion</div>
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-black text-indigo-600">100% ACID</div>
            <div class="text-xs text-slate-500 mt-0.5">Double-Booking Safe</div>
          </div>
        </div>
      </section>

      <!-- Live Interactive Match Preview Card -->
      <section class="max-w-4xl mx-auto">
        <div class="text-center mb-6">
          <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Live Matching Engine</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Explainable AI with transparent score breakdowns
          </h2>
          <p class="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            Unlike black-box directories, ExpertLink explains exactly why every advisor matches your specific technical context.
          </p>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-5">
          <!-- Query Preview Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Live Query
              </span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-1">High-Throughput Settlement Engines & Kafka Ingestion</h3>
            </div>
            <span class="text-xs text-slate-400">Industry: Fintech • Budget: $800</span>
          </div>

          <!-- Top Candidate Match Card -->
          <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                  #1
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-bold text-slate-900 dark:text-white">Dr. Sarah Chen</span>
                    <span class="text-xs text-amber-500 font-semibold">★ 4.9</span>
                  </div>
                  <p class="text-xs text-slate-500">Former Principal Architect at Stripe | Distributed Consensus & Real-Time Payments</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-bold text-slate-400">Match Fit</span>
                <div class="text-xl font-black text-brand-600 dark:text-brand-400">95%</div>
              </div>
            </div>

            <!-- Overlapping Skills Badges -->
            <div class="flex flex-wrap gap-1.5 text-xs">
              <span class="text-[11px] font-medium text-slate-400 self-center">Overlapping Skills:</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">✓ Kafka</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">✓ Distributed Systems</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">✓ Consensus Protocols</span>
            </div>

            <!-- "Why This Expert" Justification -->
            <div class="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
              <span class="font-bold text-slate-900 dark:text-white">Why this expert matches: </span>
              High semantic similarity (0.92) across distributed ledger settlement architectures. Expert possesses 14 years of experience leading payment platform scalability with verified track records at Stripe and Coinbase.
            </div>

            <!-- Subscore breakdown bars -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Semantic Sim</div>
                <div class="font-bold text-slate-700 dark:text-slate-200">92%</div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                  <div class="bg-blue-500 h-full rounded-full w-[92%]"></div>
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Skills Match</div>
                <div class="font-bold text-slate-700 dark:text-slate-200">96%</div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                  <div class="bg-emerald-500 h-full rounded-full w-[96%]"></div>
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Industry Match</div>
                <div class="font-bold text-slate-700 dark:text-slate-200">100%</div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                  <div class="bg-purple-500 h-full rounded-full w-[100%]"></div>
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 uppercase">ML Booking Prob</div>
                <div class="font-bold text-slate-700 dark:text-slate-200">89%</div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1">
                  <div class="bg-rose-500 h-full rounded-full w-[89%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="max-w-5xl mx-auto space-y-12">
        <div class="text-center">
          <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">How It Works</span>
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            From research hypothesis to 1-on-1 consultation in minutes
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Frame Your Problem</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Post rough notes or technical challenges. Our integrated AI Copilot refines your scope, categorizes industries, and suggests clarifying questions.
            </p>
          </div>

          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">ML Ranking & Scored Matches</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sentence transformer embeddings (all-MiniLM-L6-v2) and a logistic regression ranker evaluate candidates across skills, past projects, and ratings.
            </p>
          </div>

          <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Book & Gain Advisory Insights</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Schedule sessions with idempotency protection, generate automated 45-minute call agendas with pitfalls, and review consultation outcomes.
            </p>
          </div>
        </div>
      </section>

      <!-- Key Capabilities Grid -->
      <section class="max-w-5xl mx-auto space-y-8">
        <div class="text-center">
          <span class="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Architecture Features</span>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Engineered for high concurrency & enterprise reliability
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-brand-600 text-lg font-bold">⚡ Hybrid Search (RRF)</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Blends MongoDB keyword inverted indexes with vector semantic similarity, typo tolerance on skill names, and facet aggregations.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-emerald-600 text-lg font-bold">🛡️ Double-Booking Guard</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              PostgreSQL composite unique constraints and Idempotency-Key headers guarantee zero race conditions or accidental duplicate bookings.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-purple-600 text-lg font-bold">🔄 BullMQ Async Pipeline</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Redis-backed queues process matching, vectorization, and notifications asynchronously with exponential backoff and dead-letter queues.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-amber-600 text-lg font-bold">📡 Real-Time Socket.IO</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Live matching progress bar ("embedding" &rarr; "ranking" &rarr; "done") and instant booking alerts dispatched to authenticated user rooms.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-rose-600 text-lg font-bold">🔁 Feedback Loop Retraining</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Client relevance votes and consultation reviews dynamically retrain the scikit-learn ranker with model versioning and hot-reloading.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div class="text-indigo-600 text-lg font-bold">📈 Prometheus & Grafana</div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Pino JSON structured logging with correlation requestId, /metrics scrape target, and provisioned Grafana dashboards.
            </p>
          </div>
        </div>
      </section>

      <!-- Bottom CTA Banner -->
      <section class="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 p-8 sm:p-12 text-center text-white shadow-xl space-y-4">
        <h2 class="text-2xl sm:text-3xl font-black tracking-tight">Ready to test the ExpertLink platform?</h2>
        <p class="text-xs sm:text-sm text-brand-100 max-w-lg mx-auto">
          Sign in using our pre-seeded accounts for Clients, Experts, and Admins to explore queries, ML matching, and bookings immediately.
        </p>
        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            routerLink="/login"
            class="px-6 py-3 bg-white text-brand-600 hover:bg-brand-50 font-bold rounded-xl text-xs shadow transition">
            Sign In with 1-Click Demo
          </a>
          <a
            routerLink="/register"
            class="px-6 py-3 bg-brand-700/60 hover:bg-brand-700 text-white font-bold rounded-xl text-xs border border-white/20 transition">
            Create New Account
          </a>
        </div>
      </section>
    </div>
  `
})
export class LandingComponent {
  public authService = inject(AuthService);
}
