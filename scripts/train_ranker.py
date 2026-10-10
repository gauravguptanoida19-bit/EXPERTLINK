#!/usr/bin/env python3
"""
ExpertLink Offline Model Training Script
Trains the booking likelihood ranker, computes NDCG@10 and Precision@5,
and saves the model to disk as ranker_v{n}.joblib.
"""
import sys
import os

# Add apps/ml-service to path
ml_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "ml-service"))
sys.path.insert(0, ml_service_dir)

from app.ranker import ranker_service

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print("[ML Train] Training ExpertLink Ranker Model...")
    result = ranker_service.train_ranker(num_samples=2000, save_to_disk=True)
    print("[ML Train] Training Complete!")
    print(f"   Version:        {result['version']}")
    print(f"   Saved Path:     {result['savedPath']}")
    print(f"   Precision@5:    {result['metrics']['precisionAt5']}")
    print(f"   NDCG@10:        {result['metrics']['ndcgAt10']}")
    print(f"   Samples:        {result['samplesTrained']}")

    # Write initial offline metrics to docs/ml-evaluation.md
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
    os.makedirs(docs_dir, exist_ok=True)
    eval_file = os.path.join(docs_dir, "ml-evaluation.md")

    log_entry = (
        f"| {result['version']} | {result['timestamp']} | {result['samplesTrained']} | "
        f"{result['metrics']['precisionAt5']} | {result['metrics']['ndcgAt10']} | Seeded booking history + synthetic blend |\n"
    )

    if not os.path.exists(eval_file):
        with open(eval_file, "w", encoding="utf-8") as f:
            f.write("# Machine Learning Model Evaluation Log\n\n")
            f.write("Offline evaluation metrics tracked for each trained version of the ExpertLink ranking model.\n\n")
            f.write("| Model Version | Trained At (UTC) | Training Samples | Precision@5 | NDCG@10 | Notes |\n")
            f.write("|---|---|---|---|---|---|\n")
            f.write(log_entry)
    else:
        with open(eval_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

    print(f"[ML Train] Evaluation metrics appended to {eval_file}")

if __name__ == "__main__":
    main()
