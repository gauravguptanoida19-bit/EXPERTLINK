import { mlServiceClient } from '../src/modules/matching/ml-client';

describe('ML Service Integration (Milestone 4)', () => {
  it('embed should return a 384-dimensional normalized vector', async () => {
    const text = 'Autonomous electric vehicles battery management systems';
    const vec = await mlServiceClient.embed(text);
    expect(vec).toBeInstanceOf(Array);
    expect(vec.length).toBe(384);
    // Verify values are numeric
    expect(typeof vec[0]).toBe('number');
  });

  it('rank should score and rank candidate experts with sub-scores and explanations', async () => {
    const candidates = [
      {
        id: 'candidate-1',
        name: 'Dr. EV Battery Lead',
        headline: 'Principal Engineer in Solid-State Batteries and BMS',
        bio: '15 years of industry experience in battery management systems and fast charging protocols.',
        industries: ['Electric Vehicles'],
        skills: ['Battery Chemistry', 'BMS', 'Solid-State Batteries'],
        yearsExperience: 15,
        rating: 4.9,
        hourlyRateUsd: 400,
        pastEngagements: [{ topic: 'Next-Gen BMS Cell Architecture', company: 'Tesla Advisory', year: 2023 }]
      },
      {
        id: 'candidate-2',
        name: 'Healthcare Informatics Specialist',
        headline: 'EHR systems and HIPAA compliance consultant',
        bio: 'Specialist in electronic health records integration.',
        industries: ['Healthcare Systems'],
        skills: ['EHR Integration', 'Telemedicine'],
        yearsExperience: 7,
        rating: 4.2,
        hourlyRateUsd: 300,
        pastEngagements: []
      }
    ];

    const result = await mlServiceClient.rank({
      queryText: 'Need technical due diligence on solid-state battery chemistry and BMS for EV platforms',
      queryIndustry: 'Electric Vehicles',
      queryBudgetUsd: 500,
      candidates,
      topK: 2
    });

    expect(result).toHaveProperty('results');
    expect(result.results.length).toBe(2);

    const top = result.results[0];
    expect(top.expertId).toBe('candidate-1');
    expect(top.score).toBeGreaterThan(result.results[1].score);

    // Verify sub-scores
    expect(top.subScores).toHaveProperty('semanticSimilarity');
    expect(top.subScores).toHaveProperty('skillsOverlap');
    expect(top.subScores).toHaveProperty('industryMatch');
    expect(top.subScores).toHaveProperty('experienceRatingScore');
    expect(top.subScores).toHaveProperty('bookingLikelihood');

    // Verify explanation
    expect(top.explanation.industryOverlap).toBe(true);
    expect(top.explanation.matchedSkills).toContain('BMS');
    expect(top.explanation.summary).toBeTruthy();
  });
});
