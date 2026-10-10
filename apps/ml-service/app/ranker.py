import os
import glob
import re
import time
import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
import joblib

# Graceful import for scikit-learn in case host OS blocks compiled DLLs
try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import ndcg_score
    HAS_SKLEARN = True
except (ImportError, Exception):
    HAS_SKLEARN = False
    LogisticRegression = None
    ndcg_score = None

class PurePythonLogisticRegression:
    """
    Pure Python/NumPy Logistic Regression compatible with joblib dump/load.
    Used when scikit-learn C-extensions are blocked or unavailable.
    """
    def __init__(self, lr: float = 0.05, max_iter: int = 200):
        self.lr = lr
        self.max_iter = max_iter
        self.weights = None
        self.bias = 0.0

    def fit(self, X: np.ndarray, y: np.ndarray):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features, dtype=np.float32)
        self.bias = 0.0

        for _ in range(self.max_iter):
            linear = np.dot(X, self.weights) + self.bias
            # Sigmoid with clipping for numerical stability
            linear = np.clip(linear, -15.0, 15.0)
            preds = 1.0 / (1.0 + np.exp(-linear))

            dw = (1.0 / n_samples) * np.dot(X.T, (preds - y))
            db = (1.0 / n_samples) * np.sum(preds - y)

            self.weights -= self.lr * dw
            self.bias -= self.lr * db
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if self.weights is None:
            self.weights = np.array([0.4, 0.3, 0.2, 0.1, 0.1, 0.1], dtype=np.float32)
            self.bias = -0.5
        linear = np.dot(X, self.weights) + self.bias
        linear = np.clip(linear, -15.0, 15.0)
        prob1 = 1.0 / (1.0 + np.exp(-linear))
        prob0 = 1.0 - prob1
        if X.ndim == 1:
            return np.array([[prob0, prob1]])
        return np.column_stack([prob0, prob1])

def pure_ndcg_at_k(true_rel: np.ndarray, pred_scores: np.ndarray, k: int = 10) -> float:
    order = np.argsort(pred_scores)[::-1][:k]
    gains = true_rel[order]
    discounts = np.log2(np.arange(2, len(gains) + 2))
    dcg = np.sum(gains / discounts)

    ideal_order = np.argsort(true_rel)[::-1][:k]
    ideal_gains = true_rel[ideal_order]
    idcg = np.sum(ideal_gains / discounts)

    if idcg <= 0:
        return 1.0
    return float(dcg / idcg)

from .schemas import (
    RankRequest,
    RankResponse,
    RankedExpert,
    CandidateExpert,
    SubScores,
    MatchExplanation
)
from .embeddings import generate_embedding, cosine_similarity

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

class RankerService:
    def __init__(self):
        self.w_semantic = float(os.getenv("RANKER_WEIGHT_SEMANTIC", "0.40"))
        self.w_skills = float(os.getenv("RANKER_WEIGHT_SKILLS", "0.25"))
        self.w_industry = float(os.getenv("RANKER_WEIGHT_INDUSTRY", "0.15"))
        self.w_experience = float(os.getenv("RANKER_WEIGHT_EXPERIENCE", "0.10"))
        self.w_lr_model = float(os.getenv("RANKER_WEIGHT_LR_MODEL", "0.10"))

        self.lr_model: Optional[Any] = None
        self.model_version: str = "heuristic_v0"
        self.load_latest_model()

    def load_latest_model(self) -> str:
        """Finds and loads the latest ranker_v*.joblib model from disk."""
        pattern = os.path.join(MODELS_DIR, "ranker_v*.joblib")
        model_files = glob.glob(pattern)

        if not model_files:
            self.lr_model = None
            self.model_version = "heuristic_fallback_v0"
            return self.model_version

        def extract_version(path: str) -> int:
            match = re.search(r"ranker_v(\d+)\.joblib", path)
            return int(match.group(1)) if match else 0

        model_files.sort(key=extract_version)
        latest_file = model_files[-1]
        try:
            self.lr_model = joblib.load(latest_file)
            self.model_version = os.path.basename(latest_file).replace(".joblib", "")
            return self.model_version
        except Exception:
            self.lr_model = None
            self.model_version = "heuristic_fallback_v0"
            return self.model_version

    def reload_model(self) -> Dict[str, Any]:
        prev_version = self.model_version
        new_version = self.load_latest_model()
        return {
            "previousVersion": prev_version,
            "currentVersion": new_version,
            "reloadedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "hasModel": self.lr_model is not None
        }

    def _extract_matched_skills(self, query_text: str, expert_skills: List[str]) -> Tuple[List[str], float]:
        query_lower = query_text.lower()
        matched = []
        for skill in expert_skills:
            if skill.lower() in query_lower:
                matched.append(skill)

        if not expert_skills:
            return [], 0.0

        jaccard = min(1.0, len(matched) / float(max(1, len(expert_skills))))
        return matched, round(jaccard, 4)

    def _calculate_industry_match(self, query_text: str, query_ind: Optional[str], expert_inds: List[str]) -> Tuple[bool, float]:
        query_lower = query_text.lower()
        if query_ind:
            for ind in expert_inds:
                if ind.lower() == query_ind.lower():
                    return True, 1.0
                if ind.lower() in query_ind.lower() or query_ind.lower() in ind.lower():
                    return True, 0.85

        for ind in expert_inds:
            if ind.lower() in query_lower:
                return True, 0.80

        return False, 0.0

    def _find_relevant_engagements(self, query_text: str, engagements: List[Any]) -> List[str]:
        query_words = set(w for w in re.findall(r"\w+", query_text.lower()) if len(w) > 3)
        relevant = []
        for eng in engagements:
            topic = eng.topic if hasattr(eng, "topic") else eng.get("topic", "")
            company = eng.company if hasattr(eng, "company") else eng.get("company", "")
            year = eng.year if hasattr(eng, "year") else eng.get("year", 2023)
            eng_text = f"{topic} {company}".lower()
            if any(w in eng_text for w in query_words):
                relevant.append(f"{topic} ({company}, {year})")
        return relevant

    def _predict_booking_likelihood(
        self,
        semantic_sim: float,
        skills_sim: float,
        industry_sim: float,
        years_exp: float,
        rating: float,
        hourly_rate: float,
        budget: Optional[float]
    ) -> float:
        exp_norm = min(1.0, years_exp / 25.0)
        rating_norm = max(0.0, min(1.0, (rating - 3.0) / 2.0))
        budget_val = budget or 500.0
        price_ratio = min(2.0, budget_val / max(1.0, hourly_rate))

        features = np.array(
            [[semantic_sim, skills_sim, industry_sim, exp_norm, rating_norm, price_ratio]],
            dtype=np.float32
        )

        if self.lr_model is not None:
            try:
                prob = self.lr_model.predict_proba(features)[0][1]
                return round(float(prob), 4)
            except Exception:
                pass

        # Heuristic fallback
        heur = 0.35 * semantic_sim + 0.25 * skills_sim + 0.20 * industry_sim + 0.10 * exp_norm + 0.10 * rating_norm
        return round(float(heur), 4)

    def rank(self, request: RankRequest) -> RankResponse:
        t0 = time.perf_counter()
        query_emb = generate_embedding(request.queryText)

        scored_candidates: List[RankedExpert] = []

        for candidate in request.candidates:
            c_emb = candidate.embedding
            if not c_emb or len(c_emb) != 384:
                text_to_embed = f"{candidate.headline} {candidate.bio} {' '.join(candidate.skills)}"
                c_emb = generate_embedding(text_to_embed)

            semantic_sim = cosine_similarity(query_emb, c_emb)
            matched_skills, skills_sim = self._extract_matched_skills(request.queryText, candidate.skills)
            has_ind_match, industry_sim = self._calculate_industry_match(
                request.queryText, request.queryIndustry, candidate.industries
            )

            exp_norm = min(1.0, candidate.yearsExperience / 20.0)
            rating_norm = max(0.0, min(1.0, candidate.rating / 5.0))
            exp_rating_score = round(0.5 * exp_norm + 0.5 * rating_norm, 4)

            booking_prob = self._predict_booking_likelihood(
                semantic_sim,
                skills_sim,
                industry_sim,
                candidate.yearsExperience,
                candidate.rating,
                candidate.hourlyRateUsd,
                request.queryBudgetUsd
            )

            total_score = (
                self.w_semantic * semantic_sim
                + self.w_skills * skills_sim
                + self.w_industry * industry_sim
                + self.w_experience * exp_rating_score
                + self.w_lr_model * booking_prob
            )

            relevant_engagements = self._find_relevant_engagements(
                request.queryText, candidate.pastEngagements
            )

            skills_str = ", ".join(matched_skills[:3]) if matched_skills else "relevant domain background"
            eng_str = f" with direct experience at {candidate.pastEngagements[0].company}" if candidate.pastEngagements else ""
            summary = (
                f"Ranked with {int(semantic_sim * 100)}% semantic alignment, matching {len(matched_skills)} core skills "
                f"({skills_str}){eng_str}."
            )

            sub_scores = SubScores(
                semanticSimilarity=round(semantic_sim, 4),
                skillsOverlap=round(skills_sim, 4),
                industryMatch=round(industry_sim, 4),
                experienceRatingScore=round(exp_rating_score, 4),
                bookingLikelihood=round(booking_prob, 4)
            )

            explanation = MatchExplanation(
                matchedSkills=matched_skills,
                industryOverlap=has_ind_match,
                semanticSimilarity=round(semantic_sim, 4),
                relevantPastEngagements=relevant_engagements,
                summary=summary
            )

            scored_candidates.append(
                RankedExpert(
                    expertId=candidate.id,
                    score=round(float(total_score), 4),
                    subScores=sub_scores,
                    explanation=explanation
                )
            )

        scored_candidates.sort(key=lambda x: x.score, reverse=True)
        results = scored_candidates[: request.topK]
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return RankResponse(
            results=results,
            modelVersion=self.model_version,
            timingMs=round(elapsed_ms, 2)
        )

    def train_ranker(self, num_samples: int = 1000, save_to_disk: bool = True) -> Dict[str, Any]:
        np.random.seed(42)

        semantic = np.random.uniform(0.2, 0.95, num_samples)
        skills = np.random.uniform(0.0, 1.0, num_samples)
        industry = np.random.choice([0.0, 0.8, 1.0], num_samples, p=[0.3, 0.3, 0.4])
        exp = np.random.uniform(0.1, 1.0, num_samples)
        rating = np.random.uniform(0.4, 1.0, num_samples)
        price_ratio = np.random.uniform(0.5, 2.0, num_samples)

        X = np.column_stack([semantic, skills, industry, exp, rating, price_ratio])

        logits = (
            2.5 * semantic
            + 1.8 * skills
            + 1.2 * industry
            + 0.8 * exp
            + 1.0 * rating
            + 0.5 * price_ratio
            - 4.0
        )
        probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -15.0, 15.0)))
        y = (np.random.rand(num_samples) < probs).astype(int)

        if HAS_SKLEARN and LogisticRegression is not None:
            try:
                model = LogisticRegression(C=1.0, solver="lbfgs", max_iter=200)
                model.fit(X, y)
            except Exception:
                model = PurePythonLogisticRegression(max_iter=150).fit(X, y)
        else:
            model = PurePythonLogisticRegression(max_iter=150).fit(X, y)

        test_queries = 20
        candidates_per_query = 15
        precisions_at_5 = []
        ndcg_scores = []

        for _ in range(test_queries):
            X_test = np.column_stack([
                np.random.uniform(0.2, 0.95, candidates_per_query),
                np.random.uniform(0.0, 1.0, candidates_per_query),
                np.random.choice([0.0, 0.8, 1.0], candidates_per_query),
                np.random.uniform(0.1, 1.0, candidates_per_query),
                np.random.uniform(0.4, 1.0, candidates_per_query),
                np.random.uniform(0.5, 2.0, candidates_per_query)
            ])
            true_scores = (
                2.5 * X_test[:, 0]
                + 1.8 * X_test[:, 1]
                + 1.2 * X_test[:, 2]
                + 0.8 * X_test[:, 3]
                + 1.0 * X_test[:, 4]
            )
            median_score = np.median(true_scores)
            true_rel = (true_scores > median_score).astype(int)

            pred_probs = model.predict_proba(X_test)[:, 1]
            top_5_idx = np.argsort(pred_probs)[::-1][:5]
            prec_5 = float(np.mean(true_rel[top_5_idx]))
            precisions_at_5.append(prec_5)

            if HAS_SKLEARN and ndcg_score is not None:
                try:
                    ndcg = float(ndcg_score(true_rel.reshape(1, -1), pred_probs.reshape(1, -1), k=10))
                except Exception:
                    ndcg = pure_ndcg_at_k(true_rel, pred_probs, k=10)
            else:
                ndcg = pure_ndcg_at_k(true_rel, pred_probs, k=10)
            ndcg_scores.append(ndcg)

        mean_precision_at_5 = round(float(np.mean(precisions_at_5)), 4)
        mean_ndcg_at_10 = round(float(np.mean(ndcg_scores)), 4)

        new_version_num = 1
        existing_versions = glob.glob(os.path.join(MODELS_DIR, "ranker_v*.joblib"))
        if existing_versions:
            nums = []
            for p in existing_versions:
                m = re.search(r"ranker_v(\d+)\.joblib", p)
                if m:
                    nums.append(int(m.group(1)))
            if nums:
                new_version_num = max(nums) + 1

        version_str = f"ranker_v{new_version_num}"
        saved_path = None

        if save_to_disk:
            saved_path = os.path.join(MODELS_DIR, f"{version_str}.joblib")
            joblib.dump(model, saved_path)
            self.lr_model = model
            self.model_version = version_str

        return {
            "version": version_str,
            "savedPath": saved_path,
            "samplesTrained": num_samples,
            "metrics": {
                "precisionAt5": mean_precision_at_5,
                "ndcgAt10": mean_ndcg_at_10
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

ranker_service = RankerService()
