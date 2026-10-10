import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_embed_returns_384_dimensional_vector():
    response = client.post("/embed", json={"text": "Deep Learning and Large Language Models for Finance"})
    assert response.status_code == 200
    data = response.json()
    assert "embedding" in data
    assert len(data["embedding"]) == 384
    # Check normalized vector
    vec = np.array(data["embedding"])
    norm = np.linalg.norm(vec)
    assert 0.95 <= norm <= 1.05

def test_embed_empty_text_returns_400():
    response = client.post("/embed", json={"text": "   "})
    assert response.status_code == 400

def test_rank_candidates_returns_scored_and_sorted_experts():
    payload = {
        "queryText": "Looking for an expert in PyTorch, Large Language Models, and RLHF alignment for autonomous agents",
        "queryIndustry": "Artificial Intelligence",
        "queryBudgetUsd": 600,
        "candidates": [
            {
                "id": "expert-ai-01",
                "name": "Dr. AI Specialist",
                "headline": "Principal AI Scientist",
                "bio": "Specializing in Large Language Models, PyTorch, and RLHF fine-tuning.",
                "industries": ["Artificial Intelligence"],
                "skills": ["Large Language Models", "PyTorch", "RLHF"],
                "yearsExperience": 12,
                "rating": 4.9,
                "hourlyRateUsd": 500,
                "pastEngagements": [
                    {"topic": "RLHF Alignment for LLM", "company": "AI Labs", "year": 2023}
                ]
            },
            {
                "id": "expert-bio-02",
                "name": "Dr. Biotech Specialist",
                "headline": "Senior Genomics Researcher",
                "bio": "CRISPR gene editing and clinical bioinformatics trials.",
                "industries": ["Biotechnology"],
                "skills": ["CRISPR", "Genomics"],
                "yearsExperience": 8,
                "rating": 4.5,
                "hourlyRateUsd": 400,
                "pastEngagements": [
                    {"topic": "CRISPR Vector Delivery", "company": "BioCorp", "year": 2022}
                ]
            }
        ],
        "topK": 5
    }

    response = client.post("/rank", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2

    # Dr. AI Specialist must be ranked first
    top_result = data["results"][0]
    assert top_result["expertId"] == "expert-ai-01"
    assert top_result["score"] > data["results"][1]["score"]

    # Verify explainable matching sub-scores
    sub_scores = top_result["subScores"]
    assert "semanticSimilarity" in sub_scores
    assert "skillsOverlap" in sub_scores
    assert "industryMatch" in sub_scores
    assert "experienceRatingScore" in sub_scores
    assert "bookingLikelihood" in sub_scores

    # Verify explanation fields
    explanation = top_result["explanation"]
    assert "matchedSkills" in explanation
    assert "Large Language Models" in explanation["matchedSkills"] or "PyTorch" in explanation["matchedSkills"]
    assert explanation["industryOverlap"] is True
    assert len(explanation["relevantPastEngagements"]) >= 1
    assert "summary" in explanation

def test_model_training_and_hot_reload():
    # Trigger model training
    train_res = client.post("/train", json={"numSamples": 200, "saveModel": True})
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert "version" in train_data
    assert "metrics" in train_data
    assert "precisionAt5" in train_data["metrics"]
    assert "ndcgAt10" in train_data["metrics"]

    # Trigger hot-reload
    reload_res = client.post("/reload-model")
    assert reload_res.status_code == 200
    reload_data = reload_res.json()
    assert reload_data["hasModel"] is True
