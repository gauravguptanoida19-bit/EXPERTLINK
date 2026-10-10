# Machine Learning Model Evaluation Log

Offline evaluation metrics tracked for each trained version of the ExpertLink ranking model.

| Model Version | Trained At (UTC) | Training Samples | Precision@5 | NDCG@10 | Notes |
|---|---|---|---|---|---|
| ranker_v2 | 2026-10-10T21:43:57Z | 2000 | 0.8 | 0.8784 | Seeded booking history + synthetic blend |
| ranker_v1354 | 2026-10-10T21:51:31.356Z | 1000 | 0.82 | 0.885 | Nightly BullMQ retrain on feedback + bookings |
| ranker_v2367 | 2026-10-10T22:02:32.377Z | 1000 | 0.82 | 0.885 | Nightly BullMQ retrain on feedback + bookings |
| ranker_v5399 | 2026-10-10T22:05:05.403Z | 1000 | 0.82 | 0.885 | Nightly BullMQ retrain on feedback + bookings |
| ranker_v4308 | 2026-10-10T22:05:34.314Z | 1000 | 0.82 | 0.885 | Nightly BullMQ retrain on feedback + bookings |
| ranker_v5504 | 2026-10-10T22:06:25.508Z | 1000 | 0.82 | 0.885 | Nightly BullMQ retrain on feedback + bookings |
