import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { queryRepository } from '../queries/query.repository';
import { expertRepository } from '../experts/expert.repository';
import { NotFoundError } from '../../middleware/error-handler';

export interface StructuredQueryResult {
  title: string;
  industry: string;
  skills: string[];
  seniority: string;
  budgetRecommendationUsd: number;
  suggestedDescription: string;
  clarifyingQuestions: string[];
  source: 'LLM' | 'RULE_BASED_FALLBACK';
}

export interface ExpertBriefResult {
  executiveSummary: string;
  recommendedAgenda: string[];
  potentialPitfallsToExplore: string[];
  relevantExpertHighlights: string[];
  source: 'LLM' | 'RULE_BASED_FALLBACK';
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Artificial Intelligence': ['llm', 'language model', 'transformer', 'pytorch', 'machine learning', 'deep learning', 'vision', 'rlhf', 'agent'],
  'Biotechnology': ['crispr', 'gene', 'genomic', 'drug', 'clinical', 'bioinformatics', 'therapy', 'antibody'],
  'Semiconductors': ['chip', 'asic', 'lithography', 'tsmc', 'packaging', 'euv', 'wafer', 'semiconductor', 'eda'],
  'Electric Vehicles': ['ev', 'battery', 'bms', 'charging', 'powertrain', 'cell', 'cathode', 'anode', 'solid-state'],
  'Fintech': ['trading', 'payment', 'credit', 'banking', 'blockchain', 'risk', 'algorithmic', 'portfolio'],
  'Cloud Infrastructure': ['kubernetes', 'cloud', 'terraform', 'serverless', 'microservice', 'distributed', 'ebpf'],
  'Cybersecurity': ['security', 'threat', 'zero trust', 'penetration', 'siem', 'vulnerability', 'ransomware']
};

export class AssistantService {
  private detectIndustry(text: string): string {
    const lower = text.toLowerCase();
    let bestIndustry = 'Artificial Intelligence';
    let maxMatches = 0;

    for (const [ind, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      let matches = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestIndustry = ind;
      }
    }
    return bestIndustry;
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase();
    const normalizedText = lower.replace(/-/g, ' ');

    const candidateSkills = [
      { name: 'Battery Chemistry', keywords: ['batter', 'chemistry', 'cathode', 'anode', 'cell'] },
      { name: 'Solid-State Batteries', keywords: ['solid state', 'solid-state'] },
      { name: 'BMS', keywords: ['bms', 'battery management'] },
      { name: 'Fast Charging', keywords: ['fast charging', 'supercharging'] },
      { name: 'Large Language Models', keywords: ['llm', 'large language', 'language model'] },
      { name: 'PyTorch', keywords: ['pytorch'] },
      { name: 'Transformers', keywords: ['transformer', 'attention'] },
      { name: 'RLHF', keywords: ['rlhf', 'alignment'] },
      { name: 'CRISPR', keywords: ['crispr', 'gene editing'] },
      { name: 'Genomics', keywords: ['genomic', 'genome', 'sequencing'] },
      { name: 'EUV Lithography', keywords: ['euv', 'lithography'] },
      { name: 'ASIC Design', keywords: ['asic', 'chip design'] },
      { name: 'Kubernetes', keywords: ['kubernetes', 'k8s'] },
      { name: 'Zero Trust', keywords: ['zero trust'] }
    ];

    const matched = candidateSkills
      .filter((item) => item.keywords.some((kw) => normalizedText.includes(kw) || lower.includes(kw)))
      .map((item) => item.name);

    return matched.length > 0 ? matched : ['Technical Architecture', 'Domain Strategy', 'Due Diligence'];
  }

  private generateClarifyingQuestions(industry: string, text: string): string[] {
    switch (industry) {
      case 'Electric Vehicles':
        return [
          'What specific cell chemistry (NMC, LFP, sodium-ion, solid-state) are you targeting?',
          'What telemetry frequency and bus protocols (CAN, Ethernet) does your platform operate on?',
          'Are you looking for physics-based electrochemical degradation models or black-box ML predictors?'
        ];
      case 'Semiconductors':
        return [
          'What process node generation (3nm, 2nm, sub-2nm) is under commercial evaluation?',
          'Are thermal dissipation and 2.5D/3D advanced packaging yields primary concerns?',
          'Do you need tape-out verification experience or foundry procurement pricing benchmarks?'
        ];
      case 'Biotechnology':
        return [
          'What delivery vector mechanism (LNP, AAV, viral) are you analyzing?',
          'At what phase of preclinical validation or IND-enabling studies is your asset?',
          'Do you require insights into FDA expedited review pathways and IP freedom-to-operate?'
        ];
      case 'Artificial Intelligence':
      default:
        return [
          'What inference latency and memory budget constraints are required for production deployment?',
          'Are you training proprietary foundation models from scratch or fine-tuning existing weights with LoRA/QLoRA?',
          'What evaluation benchmarks and human alignment methodologies are currently established?'
        ];
    }
  }

  public async structureQuery(rawText: string): Promise<StructuredQueryResult> {
    // If LLM_API_KEY is available, attempt real generative extraction
    if (env.LLM_API_KEY && env.LLM_API_KEY.trim().length > 5) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const prompt = `You are ExpertLink AI Assistant. Convert this vague research request into a structured expert query.
Return strict JSON with this structure:
{
  "title": "string",
  "industry": "string",
  "skills": ["string"],
  "seniority": "string",
  "budgetRecommendationUsd": number,
  "suggestedDescription": "string",
  "clarifyingQuestions": ["string"]
}

Request: "${rawText}"`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL}:generateContent?key=${env.LLM_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const json = (await res.json()) as any;
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            return {
              title: parsed.title,
              industry: parsed.industry,
              skills: parsed.skills,
              seniority: parsed.seniority || 'Principal Specialist (15+ yrs)',
              budgetRecommendationUsd: parsed.budgetRecommendationUsd || 1500,
              suggestedDescription: parsed.suggestedDescription,
              clarifyingQuestions: parsed.clarifyingQuestions || [],
              source: 'LLM'
            };
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'LLM structuring request failed, falling back to deterministic extraction');
      }
    }

    // Deterministic Rule-Based Fallback
    const industry = this.detectIndustry(rawText);
    const skills = this.extractSkills(rawText);
    const questions = this.generateClarifyingQuestions(industry, rawText);

    const title = `Technical Assessment & Commercial Advisory in ${industry}: ${skills.slice(0, 2).join(' & ')}`;
    const suggestedDescription = `We are conducting in-depth technical due diligence on ${rawText.trim()}. We require an experienced industry advisor to evaluate architectural trade-offs, state-of-the-art benchmarks, operational pitfalls, and realistic time-to-market.`;

    return {
      title,
      industry,
      skills,
      seniority: 'Principal Specialist (12+ years experience)',
      budgetRecommendationUsd: 1800,
      suggestedDescription,
      clarifyingQuestions: questions,
      source: 'RULE_BASED_FALLBACK'
    };
  }

  public async generateExpertBrief(queryId: string, expertId: string): Promise<ExpertBriefResult> {
    const query = await queryRepository.findById(queryId);
    if (!query) {
      throw new NotFoundError(`Query '${queryId}' not found`);
    }

    const expert = await expertRepository.findByUserId(expertId);
    if (!expert) {
      throw new NotFoundError(`Expert '${expertId}' not found`);
    }

    // If LLM_API_KEY is available, attempt real generative briefing
    if (env.LLM_API_KEY && env.LLM_API_KEY.trim().length > 5) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const prompt = `Generate a concise pre-call client briefing before a 60-minute consultation.
Query: "${query.title}. ${query.description}"
Expert: ${expert.name}, ${expert.headline}. Bio: ${expert.bio}. Skills: ${expert.skills.join(', ')}.

Return strict JSON:
{
  "executiveSummary": "string",
  "recommendedAgenda": ["string"],
  "potentialPitfallsToExplore": ["string"],
  "relevantExpertHighlights": ["string"]
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${env.LLM_MODEL}:generateContent?key=${env.LLM_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const json = (await res.json()) as any;
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            return {
              executiveSummary: parsed.executiveSummary,
              recommendedAgenda: parsed.recommendedAgenda,
              potentialPitfallsToExplore: parsed.potentialPitfallsToExplore,
              relevantExpertHighlights: parsed.relevantExpertHighlights,
              source: 'LLM'
            };
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'LLM brief generation failed, using deterministic briefing');
      }
    }

    // Deterministic Rule-Based Fallback
    const firstCompany = expert.pastEngagements?.[0]?.company || 'industry leading organizations';
    const topSkills = expert.skills.slice(0, 3).join(', ');

    const executiveSummary = `${expert.name} offers ${expert.yearsExperience} years of senior expertise in ${expert.industries.join(', ')}, specializing in ${topSkills}. Prior advisory engagements at ${firstCompany} make them ideal for evaluating "${query.title}".`;

    const recommendedAgenda = [
      '00-10m: Overview of client problem context and current architecture baseline',
      `10-30m: Deep-dive on ${expert.skills[0] || 'core technical'} design patterns, trade-offs, and proven alternatives`,
      `30-50m: Analysis of production challenges, unit economics, and vendor selection`,
      '50-60m: Recommended actionable next steps, risks to mitigate, and follow-up resources'
    ];

    const potentialPitfallsToExplore = [
      'Underestimating integration complexity and legacy system technical debt',
      'Premature scaling before verifying unit economics and yield consistency',
      'Unforeseen regulatory compliance hurdles and certification lead times'
    ];

    const relevantExpertHighlights = [
      `${expert.yearsExperience} years in ${expert.industries[0] || 'domain'} with a verified rating of ${expert.rating} / 5.0`,
      ...(expert.pastEngagements?.map((p) => `Prior work on ${p.topic} at ${p.company} (${p.year})`) || [])
    ];

    return {
      executiveSummary,
      recommendedAgenda,
      potentialPitfallsToExplore,
      relevantExpertHighlights,
      source: 'RULE_BASED_FALLBACK'
    };
  }
}

export const assistantService = new AssistantService();
