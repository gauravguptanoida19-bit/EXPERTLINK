import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {"message": "ExpertLink ML Service is running"}
