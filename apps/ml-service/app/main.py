import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    EmbedRequest,
    EmbedResponse,
    RankRequest,
    RankResponse,
    TrainRequest
)
from .embeddings import generate_embedding
from .ranker import ranker_service

app = FastAPI(
    title="ExpertLink ML Service",
    description="Embeddings and Hybrid ML Ranker for ExpertLink Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "expertlink-ml-service",
        "model": os.getenv("ML_MODEL_NAME", "all-MiniLM-L6-v2"),
        "rankerVersion": ranker_service.model_version,
        "hasTrainedModel": ranker_service.lr_model is not None,
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {"message": "ExpertLink ML Service is running"}

@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    vec = generate_embedding(request.text)
    return EmbedResponse(embedding=vec, dimension=len(vec))

@app.post("/rank", response_model=RankResponse)
def rank(request: RankRequest):
    if not request.candidates:
        return RankResponse(results=[], modelVersion=ranker_service.model_version, timingMs=0.0)
    return ranker_service.rank(request)

@app.post("/reload-model")
def reload_model():
    """Hot-reload the latest model version from disk."""
    return ranker_service.reload_model()

@app.post("/train")
def train_model_endpoint(req: TrainRequest = TrainRequest()):
    """Train new ranker version and log metrics."""
    result = ranker_service.train_ranker(num_samples=req.numSamples, save_to_disk=req.saveModel)
    return result
