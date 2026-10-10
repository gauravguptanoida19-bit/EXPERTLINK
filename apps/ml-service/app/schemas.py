from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to encode into 384-dimensional vector")

class EmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int = 384

class PastEngagement(BaseModel):
    topic: str
    company: str
    year: int

class CandidateExpert(BaseModel):
    id: str
    name: str
    headline: str
    bio: str
    industries: List[str] = []
    skills: List[str] = []
    yearsExperience: float = 0.0
    rating: float = 5.0
    hourlyRateUsd: float = 100.0
    pastEngagements: List[PastEngagement] = []
    embedding: Optional[List[float]] = None

class RankRequest(BaseModel):
    queryText: str = Field(..., min_length=1)
    queryIndustry: Optional[str] = None
    queryBudgetUsd: Optional[float] = None
    candidates: List[CandidateExpert]
    topK: int = 10

class SubScores(BaseModel):
    semanticSimilarity: float
    skillsOverlap: float
    industryMatch: float
    experienceRatingScore: float
    bookingLikelihood: float

class MatchExplanation(BaseModel):
    matchedSkills: List[str]
    industryOverlap: bool
    semanticSimilarity: float
    relevantPastEngagements: List[str]
    summary: str

class RankedExpert(BaseModel):
    expertId: str
    score: float
    subScores: SubScores
    explanation: MatchExplanation

class RankResponse(BaseModel):
    results: List[RankedExpert]
    modelVersion: str
    timingMs: float

class TrainRequest(BaseModel):
    numSamples: int = 1000
    saveModel: bool = True
