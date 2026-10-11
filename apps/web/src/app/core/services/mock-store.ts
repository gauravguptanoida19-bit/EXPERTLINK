import { User, AuthResponse, QueryItem, MatchItem, BookingItem, ExpertProfile } from '../models/user.model';

const STORAGE_KEY_PREFIX = 'expertlink_mock_';

export function isGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('github.io') || localStorage.getItem('expertlink_mock_mode') === 'true';
}

const DEFAULT_USERS: User[] = [
  {
    id: 'demo-client-id-001',
    name: 'Sarah Connor (Acme Capital)',
    email: 'client@expertlink.com',
    role: 'CLIENT',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-expert-id-001',
    name: 'Dr. Alan Turing',
    email: 'expert@expertlink.com',
    role: 'EXPERT',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'demo-admin-id-001',
    name: 'Admin User',
    email: 'admin@expertlink.com',
    role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const DEFAULT_EXPERTS: ExpertProfile[] = [
  {
    id: 'exp_demo_001',
    userId: 'demo-expert-id-001',
    name: 'Dr. Alan Turing',
    email: 'expert@expertlink.com',
    headline: 'Principal AI Scientist & LLM Architect',
    bio: 'Over 15 years pioneering deep learning architectures, foundational LLM pretraining, and reinforcement learning alignment at top research labs.',
    industries: ['Artificial Intelligence', 'Cloud Infrastructure', 'Cybersecurity'],
    skills: ['Large Language Models', 'Transformers', 'RLHF', 'Fine-tuning', 'PyTorch', 'MLOps'],
    yearsExperience: 16,
    pastEngagements: [
      { topic: 'LLM Alignment and Safety Evaluation', company: 'DeepMind / OpenAI', year: 2024 },
      { topic: 'Distributed Training on 10k H100s', company: 'Anthropic', year: 2023 }
    ],
    hourlyRateUsd: 450,
    availability: ['Monday afternoons', 'Wednesday mornings', 'Friday anytime'],
    rating: 4.95
  },
  {
    id: 'exp_demo_002',
    userId: 'demo-expert-id-002',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@biotech-innovate.com',
    headline: 'Senior Principal Bioinformatician & CRISPR Lead',
    bio: 'Specializing in computational genomics, CRISPR-Cas9 target design, and deep learning for drug discovery.',
    industries: ['Biotechnology', 'Healthcare Systems'],
    skills: ['CRISPR', 'Genomics', 'Bioinformatics', 'Drug Discovery', 'Clinical Trials'],
    yearsExperience: 14,
    pastEngagements: [
      { topic: 'Accelerated Antibody Screening Pipeline', company: 'Genentech', year: 2023 }
    ],
    hourlyRateUsd: 400,
    availability: ['Tuesday mornings', 'Thursday afternoons'],
    rating: 4.90
  },
  {
    id: 'exp_demo_003',
    userId: 'demo-expert-id-003',
    name: 'Marcus Vance',
    email: 'm.vance@quantfunds.io',
    headline: 'Managing Director of Algorithmic Trading & DeFi Infrastructure',
    bio: '20+ years building ultra-low-latency market making engines, automated risk modeling, and institutional settlement rails.',
    industries: ['Fintech', 'Cybersecurity'],
    skills: ['Algorithmic Trading', 'Blockchain', 'Payment Rails', 'Risk Modeling', 'Credit Scoring'],
    yearsExperience: 21,
    pastEngagements: [
      { topic: 'Sub-microsecond FX Routing System', company: 'Citadel Securities', year: 2022 }
    ],
    hourlyRateUsd: 550,
    availability: ['Weekdays after market close'],
    rating: 4.98
  },
  {
    id: 'exp_demo_004',
    userId: 'demo-expert-id-004',
    name: 'Sarah Lin',
    email: 'sarah.lin@semicondesign.com',
    headline: 'VP of Semiconductor Fabrication & EUV Lithography',
    bio: 'Leading sub-3nm chip tape-outs, packaging innovations, and advanced EDA tool synthesis for cutting-edge silicon.',
    industries: ['Semiconductors', 'Cloud Infrastructure'],
    skills: ['EUV Lithography', 'ASIC Design', 'Packaging', 'TSMC Process', 'EDA Tools', 'RISC-V Architecture'],
    yearsExperience: 18,
    pastEngagements: [
      { topic: 'High-Density 3nm Chiplet Packaging', company: 'NVIDIA Partner Group', year: 2024 }
    ],
    hourlyRateUsd: 500,
    availability: ['Wednesday afternoons', 'Thursday mornings'],
    rating: 4.92
  },
  {
    id: 'exp_demo_005',
    userId: 'demo-expert-id-005',
    name: 'David Kross',
    email: 'david.kross@cloudarch.dev',
    headline: 'Chief Cloud Systems Architect & Kubernetes Specialist',
    bio: 'Architecting multi-region resilient cloud infrastructures, eBPF telemetry, and zero-downtime service meshes at hyper-scale.',
    industries: ['Cloud Infrastructure', 'Cybersecurity'],
    skills: ['Kubernetes', 'Serverless', 'Multi-cloud', 'Terraform', 'eBPF', 'High Availability'],
    yearsExperience: 15,
    pastEngagements: [
      { topic: 'Global 99.999% Service Mesh Overhaul', company: 'Stripe Advisory', year: 2023 }
    ],
    hourlyRateUsd: 380,
    availability: ['Flexible weekdays'],
    rating: 4.88
  }
];

const DEFAULT_QUERIES: QueryItem[] = [
  {
    id: 'query_demo_001',
    clientId: 'demo-client-id-001',
    title: 'Enterprise LLM Fine-tuning & Production Alignment Architecture',
    description: 'We are evaluating options for deploying custom 70B parameter open-weights models in private VPCs with strict PII filtering and low-latency inference.',
    industry: 'Artificial Intelligence',
    budgetUsd: 5000,
    status: 'MATCHED',
    createdAt: '2026-01-02T10:00:00.000Z'
  },
  {
    id: 'query_demo_002',
    clientId: 'demo-client-id-001',
    title: 'Next-Generation Battery Management Systems for Commercial EVs',
    description: 'Seeking consultation on solid-state battery thermal management, fast charging cycle degradation, and BMS telemetry integration.',
    industry: 'Electric Vehicles',
    budgetUsd: 3500,
    status: 'OPEN',
    createdAt: '2026-01-03T14:30:00.000Z'
  }
];

const DEFAULT_BOOKINGS: BookingItem[] = [
  {
    id: 'booking_demo_001',
    queryId: 'query_demo_001',
    expertId: 'demo-expert-id-001',
    clientId: 'demo-client-id-001',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMin: 60,
    status: 'CONFIRMED',
    ratePerHourUsd: 450,
    createdAt: '2026-01-02T12:00:00.000Z'
  }
];

export class MockStore {
  private getStorage<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
    } catch (_) {}
  }

  public initDefaults(): void {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'users')) {
      this.setStorage('users', DEFAULT_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'experts')) {
      this.setStorage('experts', DEFAULT_EXPERTS);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'queries')) {
      this.setStorage('queries', DEFAULT_QUERIES);
    }
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'bookings')) {
      this.setStorage('bookings', DEFAULT_BOOKINGS);
    }
  }

  // --- Auth ---
  public login(email: string, _password?: string): AuthResponse {
    this.initDefaults();
    const users = this.getStorage<User[]>('users', DEFAULT_USERS);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const token = 'mock_jwt_token_' + btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }));
    return {
      user,
      tokens: {
        accessToken: token,
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresIn: '15m'
      }
    };
  }

  public register(payload: { name: string; email: string; role: string }): AuthResponse {
    this.initDefaults();
    const users = this.getStorage<User[]>('users', DEFAULT_USERS);
    const existing = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const newUser: User = {
      id: `user_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: payload.name,
      email: payload.email.toLowerCase(),
      role: payload.role as any,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.setStorage('users', users);

    // If expert, create blank expert profile
    if (newUser.role === 'EXPERT') {
      const experts = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
      experts.push({
        id: `exp_${newUser.id}`,
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        headline: 'Domain Expert',
        bio: 'Industry consultant and technical specialist.',
        industries: ['Artificial Intelligence'],
        skills: ['Consulting', 'Architecture'],
        yearsExperience: 5,
        pastEngagements: [],
        hourlyRateUsd: 250,
        availability: ['Weekdays'],
        rating: 5.0
      });
      this.setStorage('experts', experts);
    }

    return this.login(newUser.email);
  }

  // --- Experts ---
  public getExperts(filters: any = {}): { items: ExpertProfile[]; nextCursor: string | null; total: number } {
    this.initDefaults();
    let list = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter((e) => e.name?.toLowerCase().includes(s) || e.headline.toLowerCase().includes(s) || e.skills.some((sk) => sk.toLowerCase().includes(s)));
    }
    if (filters.industry) {
      list = list.filter((e) => e.industries.some((i) => i.toLowerCase().includes(filters.industry.toLowerCase())));
    }
    return {
      items: list,
      nextCursor: null,
      total: list.length
    };
  }

  public getExpertById(userId: string): ExpertProfile | null {
    this.initDefaults();
    const list = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
    return list.find((e) => e.userId === userId) || list[0] || null;
  }

  public updateExpertProfile(userId: string, data: Partial<ExpertProfile>): ExpertProfile {
    this.initDefaults();
    const list = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
    const idx = list.findIndex((e) => e.userId === userId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      this.setStorage('experts', list);
      return list[idx];
    } else {
      const newProf: ExpertProfile = {
        id: `exp_${userId}`,
        userId,
        name: data.name || 'Dr. Alan Turing',
        email: data.email || 'expert@expertlink.com',
        headline: data.headline || 'Principal AI Scientist & LLM Architect',
        bio: data.bio || '',
        industries: data.industries || ['Artificial Intelligence'],
        skills: data.skills || ['Large Language Models'],
        yearsExperience: data.yearsExperience || 10,
        pastEngagements: data.pastEngagements || [],
        hourlyRateUsd: data.hourlyRateUsd || 350,
        availability: data.availability || ['Flexible'],
        rating: 4.95
      };
      list.push(newProf);
      this.setStorage('experts', list);
      return newProf;
    }
  }

  public searchExpertsHybrid(params: any = {}): any {
    this.initDefaults();
    const list = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
    const q = (params.q || '').toLowerCase();

    const scored = list.map((exp, index) => {
      const matchedSkills = exp.skills.filter((s) => s.toLowerCase().includes(q) || q.includes(s.toLowerCase()));
      const matchScore = q ? (matchedSkills.length > 0 ? 0.92 : 0.65) : 0.85;
      return {
        expert: exp,
        rrfScore: Number((1 / (60 + index + 1)).toFixed(5)),
        keywordRank: index + 1,
        semanticRank: index + 1,
        matchedSkills,
        score: matchScore
      };
    });

    return {
      query: params.q || '',
      totalMatches: scored.length,
      latencyMs: 12,
      experts: scored,
      facets: {
        industries: {
          'Artificial Intelligence': 1,
          'Biotechnology': 1,
          'Fintech': 1,
          'Semiconductors': 1,
          'Cloud Infrastructure': 2
        },
        skills: {
          'Large Language Models': 1,
          'CRISPR': 1,
          'Algorithmic Trading': 1,
          'Kubernetes': 1,
          'EUV Lithography': 1
        },
        rateBands: {
          under200: 0,
          from200to400: 2,
          from400to600: 3,
          above600: 0
        }
      }
    };
  }

  // --- Queries ---
  public getQueries(clientId?: string): QueryItem[] {
    this.initDefaults();
    const list = this.getStorage<QueryItem[]>('queries', DEFAULT_QUERIES);
    if (!clientId) return list;
    return list.filter((q) => q.clientId === clientId || q.clientId === 'demo-client-id-001');
  }

  public getQueryById(id: string): QueryItem | null {
    this.initDefaults();
    const list = this.getStorage<QueryItem[]>('queries', DEFAULT_QUERIES);
    const q = list.find((item) => item.id === id);
    if (!q) return null;

    if (!q.matches || q.matches.length === 0) {
      q.matches = this.generateMatches(q);
    }
    return q;
  }

  public createQuery(data: any, clientId: string): QueryItem {
    this.initDefaults();
    const list = this.getStorage<QueryItem[]>('queries', DEFAULT_QUERIES);
    const newQ: QueryItem = {
      id: `query_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clientId: clientId || 'demo-client-id-001',
      title: data.title,
      description: data.description,
      industry: data.industry,
      budgetUsd: Number(data.budgetUsd),
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    list.unshift(newQ);
    this.setStorage('queries', list);
    return newQ;
  }

  public matchQuery(queryId: string): { jobId: string; statusUrl: string; data?: MatchItem[] } {
    this.initDefaults();
    const list = this.getStorage<QueryItem[]>('queries', DEFAULT_QUERIES);
    const q = list.find((item) => item.id === queryId);
    const matches = this.generateMatches(q);
    if (q) {
      q.status = 'MATCHED';
      q.matches = matches;
      this.setStorage('queries', list);
    }
    const jobId = `job_mock_${Date.now()}`;
    this.setStorage(`job_${jobId}`, { status: 'completed', result: { matches } });
    return {
      jobId,
      statusUrl: `/api/jobs/${jobId}`,
      data: matches
    };
  }

  public getJobStatus(jobId: string): any {
    this.initDefaults();
    const stored = this.getStorage<any>(`job_${jobId}`, null);
    if (stored) return stored;
    return {
      id: jobId,
      status: 'completed',
      result: { matches: this.generateMatches() }
    };
  }

  private generateMatches(query?: Partial<QueryItem>): MatchItem[] {
    const experts = this.getStorage<ExpertProfile[]>('experts', DEFAULT_EXPERTS);
    return experts.map((exp, i) => {
      const isIndMatch = query?.industry ? exp.industries.some((ind) => ind.toLowerCase().includes(query.industry!.toLowerCase())) : i === 0;
      const semanticScore = Number((0.92 - i * 0.08).toFixed(4));
      const skillsScore = Number((0.85 - i * 0.05).toFixed(4));
      const total = Number((0.4 * semanticScore + 0.25 * skillsScore + (isIndMatch ? 0.2 : 0.05) + 0.15).toFixed(4));
      return {
        expertId: exp.userId,
        score: total,
        subScores: {
          semanticSimilarity: semanticScore,
          skillsOverlap: skillsScore,
          industryMatch: isIndMatch ? 1.0 : 0.3,
          experienceRatingScore: Number((exp.rating / 5).toFixed(2)),
          bookingLikelihood: 0.88
        },
        explanation: {
          matchedSkills: exp.skills.slice(0, 3),
          industryOverlap: isIndMatch,
          semanticSimilarity: semanticScore,
          relevantPastEngagements: exp.pastEngagements.map((p) => `${p.topic} (${p.company})`),
          summary: `High semantic alignment (${Math.round(semanticScore * 100)}%) with proven track record in ${exp.industries[0]}.`
        },
        expert: {
          id: exp.userId,
          name: exp.name || 'Expert Advisor',
          headline: exp.headline,
          hourlyRateUsd: exp.hourlyRateUsd,
          rating: exp.rating,
          industries: exp.industries,
          skills: exp.skills
        }
      };
    });
  }

  // --- Bookings ---
  public getBookings(userId: string, role: string): BookingItem[] {
    this.initDefaults();
    const list = this.getStorage<BookingItem[]>('bookings', DEFAULT_BOOKINGS);
    if (role === 'CLIENT') {
      return list.filter((b) => b.clientId === userId || b.clientId === 'demo-client-id-001');
    } else if (role === 'EXPERT') {
      return list.filter((b) => b.expertId === userId || b.expertId === 'demo-expert-id-001');
    }
    return list;
  }

  public createBooking(data: any, clientId: string): BookingItem {
    this.initDefaults();
    const list = this.getStorage<BookingItem[]>('bookings', DEFAULT_BOOKINGS);
    const newB: BookingItem = {
      id: `booking_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      queryId: data.queryId || 'query_demo_001',
      expertId: data.expertId,
      clientId: clientId || 'demo-client-id-001',
      scheduledAt: data.scheduledAt,
      durationMin: Number(data.durationMin) || 60,
      ratePerHourUsd: Number(data.ratePerHourUsd) || 450,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    list.unshift(newB);
    this.setStorage('bookings', list);
    return newB;
  }

  public updateBookingStatus(id: string, status: any): BookingItem {
    this.initDefaults();
    const list = this.getStorage<BookingItem[]>('bookings', DEFAULT_BOOKINGS);
    const b = list.find((item) => item.id === id);
    if (b) {
      b.status = status;
      this.setStorage('bookings', list);
      return b;
    }
    throw new Error('Booking not found');
  }

  // --- Analytics ---
  public getAnalytics(): any {
    this.initDefaults();
    const queries = this.getStorage<QueryItem[]>('queries', DEFAULT_QUERIES);
    const bookings = this.getStorage<BookingItem[]>('bookings', DEFAULT_BOOKINGS);

    const totalQueries = queries.length;
    const totalBookings = bookings.length;
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length;
    const matchAcceptanceRatePercent = totalQueries > 0 ? Number(((confirmed / totalQueries) * 100).toFixed(1)) : 50;

    return {
      totalQueries,
      totalBookings,
      matchAcceptanceRatePercent,
      avgHoursToBooking: 1.8,
      queryVolumePerDay: [
        { date: '2026-10-05', count: 1 },
        { date: '2026-10-06', count: 2 },
        { date: '2026-10-07', count: 1 },
        { date: '2026-10-08', count: 3 },
        { date: '2026-10-09', count: 2 },
        { date: '2026-10-10', count: 4 },
        { date: '2026-10-11', count: totalQueries }
      ],
      topIndustries: [
        { industry: 'Artificial Intelligence', queryCount: 3, estimatedSpendUsd: 15000 },
        { industry: 'Electric Vehicles', queryCount: 2, estimatedSpendUsd: 7000 },
        { industry: 'Fintech', queryCount: 1, estimatedSpendUsd: 4500 },
        { industry: 'Cloud Infrastructure', queryCount: 1, estimatedSpendUsd: 3800 }
      ]
    };
  }

  // --- AI Assistant ---
  public structureQuery(rawText: string): any {
    return {
      structuredQuery: {
        title: rawText.slice(0, 60),
        industry: rawText.toLowerCase().includes('fintech') ? 'Fintech' : rawText.toLowerCase().includes('bio') ? 'Biotechnology' : 'Artificial Intelligence',
        requiredSkills: ['Architecture Review', 'Production Deployment', 'Optimization'],
        targetSeniorityYears: 12,
        estimatedBudgetUsd: 5000
      },
      clarifyingQuestions: [
        'What specific scale or throughput requirements do you anticipate in production?',
        'Do you require compliance certifications (e.g. HIPAA, SOC2, PCI-DSS)?'
      ]
    };
  }

  public expertBrief(params: any): any {
    return {
      brief: {
        expertHeadline: params.expertHeadline || 'Principal Technical Architect',
        executiveSummary: 'Pre-call strategic briefing analyzing domain alignment and technical topics.',
        consultationAgenda: [
          '1. Architecture Overview & High-level Constraints (15 min)',
          '2. Deep-dive on Technical Bottlenecks & Design Trade-offs (30 min)',
          '3. Implementation Roadmap & Pitfall Mitigation (15 min)'
        ],
        knownPitfalls: [
          'Premature scaling without baseline profiling',
          'Neglecting latency overhead in cross-region replication'
        ]
      }
    };
  }
}

export const mockStore = new MockStore();
