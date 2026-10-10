export type Role = 'CLIENT' | 'EXPERT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface QueryItem {
  id: string;
  clientId: string;
  title: string;
  description: string;
  industry: string;
  budgetUsd: number;
  status: 'OPEN' | 'MATCHED' | 'CLOSED';
  createdAt: string;
  matches?: MatchItem[];
}

export interface MatchItem {
  id?: string;
  expertId: string;
  score: number;
  subScores: {
    semanticSimilarity: number;
    skillsOverlap: number;
    industryMatch: number;
    experienceRatingScore: number;
    bookingLikelihood: number;
  };
  explanation: {
    matchedSkills: string[];
    industryOverlap: boolean;
    semanticSimilarity: number;
    relevantPastEngagements: string[];
    summary: string;
  };
  expert: {
    id: string;
    name: string;
    headline: string;
    hourlyRateUsd: number;
    rating: number;
    industries: string[];
    skills: string[];
  };
}

export interface BookingItem {
  id: string;
  queryId: string;
  expertId: string;
  clientId: string;
  scheduledAt: string;
  durationMin: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  ratePerHourUsd: number;
  createdAt: string;
}

export interface ExpertProfile {
  id?: string;
  userId: string;
  name?: string;
  email?: string;
  headline: string;
  bio: string;
  industries: string[];
  skills: string[];
  yearsExperience: number;
  pastEngagements: Array<{ topic: string; company: string; year: number }>;
  hourlyRateUsd: number;
  availability: string[];
  rating: number;
}
