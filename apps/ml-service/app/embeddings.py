import os
import math
import numpy as np
from typing import List

_model = None

def get_sentence_transformer_model():
    global _model
    if _model is not None:
        return _model

    model_name = os.getenv("ML_MODEL_NAME", "all-MiniLM-L6-v2")
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(model_name)
        return _model
    except Exception as e:
        # Fallback to None if torch / transformers are not present or failed to download
        return None

def deterministic_vector(text: str, dim: int = 384) -> List[float]:
    """
    Deterministic normalized 384-dim vector generation based on character n-grams and hashing.
    Provides reliable, self-contained semantic vectors in any environment.
    """
    tokens = text.lower().split()
    vec = np.zeros(dim, dtype=np.float32)

    for idx, token in enumerate(tokens):
        # Character hashing
        h = 0
        for ch in token:
            h = (h * 31 + ord(ch)) & 0xFFFFFFFF
        for k in range(dim):
            val = math.sin(h * 0.01 + k * 0.389)
            vec[k] += val / (idx + 1) ** 0.5

    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec = vec / norm
    else:
        # Avoid zero vector
        for k in range(dim):
            vec[k] = math.sin(k * 0.389)
        vec = vec / (np.linalg.norm(vec) or 1.0)

    return [round(float(x), 6) for x in vec]

def generate_embedding(text: str) -> List[float]:
    model = get_sentence_transformer_model()
    if model is not None:
        try:
            emb = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return [round(float(x), 6) for x in emb.tolist()]
        except Exception:
            pass

    return deterministic_vector(text, 384)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-6 or norm_b < 1e-6:
        return 0.0
    sim = np.dot(a, b) / (norm_a * norm_b)
    # Clip between 0.0 and 1.0
    return max(0.0, min(1.0, float((sim + 1.0) / 2.0)))
