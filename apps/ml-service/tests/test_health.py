from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "expertlink-ml-service"

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "ExpertLink ML Service" in response.json()["message"]
