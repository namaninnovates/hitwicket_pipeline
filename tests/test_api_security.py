"""
Security test suite for API endpoints.
Verifies input validation, path traversal defense, command execution constraints,
API key sanitization, database reset protection, and defensive HTTP headers.
"""

import pytest
from fastapi.testclient import TestClient
from api.index import app

client = TestClient(app)


def test_security_headers():
    """Verify defensive HTTP response headers are set on all responses."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-xss-protection") == "1; mode=block"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_doc_endpoint_path_traversal():
    """Verify path traversal attempts and invalid docs are blocked."""
    # Disallowed/malicious doc names
    res = client.get("/api/docs/..%2F..%2Fetc%2Fpasswd")
    assert res.status_code in [404, 400, 422]

    res = client.get("/api/docs/nonexistent_file")
    assert res.status_code == 404

    # Valid doc should succeed
    res = client.get("/api/docs/scoring")
    assert res.status_code == 200
    assert "title" in res.json()


def test_brief_endpoint_invalid_game():
    """Verify game parameter is whitelisted and path traversal is prevented."""
    res = client.get("/api/brief?game=../../secret")
    assert res.status_code == 400

    res = client.get("/api/brief?game=invalid_game_xyz")
    assert res.status_code == 400

    # Valid games should return 200
    res = client.get("/api/brief?game=hitwicket")
    assert res.status_code == 200


def test_pipeline_stream_validation():
    """Verify parameters passed to the pipeline streaming endpoint are strictly validated."""
    # Invalid stages
    res = client.get("/api/pipeline/stream?stages=inject_code,all")
    assert res.status_code == 400

    # Out-of-bounds max_reviews
    res = client.get("/api/pipeline/stream?max_reviews=0")
    assert res.status_code == 422

    res = client.get("/api/pipeline/stream?max_reviews=10000")
    assert res.status_code == 422

    # Out-of-bounds days
    res = client.get("/api/pipeline/stream?days=0")
    assert res.status_code == 422

    res = client.get("/api/pipeline/stream?days=500")
    assert res.status_code == 422

    # Invalid game
    res = client.get("/api/pipeline/stream?games=malicious_game;rm")
    assert res.status_code == 400


def test_api_key_validation():
    """Verify API key payload rejects newlines, control characters, and dangerous inputs."""
    # Key with newline (environment injection attempt)
    res = client.post("/api/config/key", json={"api_key": "AQ.validkey123\nINJECTED_VAR=true"})
    assert res.status_code == 422

    # Key with spaces or special chars
    res = client.post("/api/config/key", json={"api_key": "bad key with spaces"})
    assert res.status_code == 422

    # Too short
    res = client.post("/api/config/key", json={"api_key": "short"})
    assert res.status_code == 422


def test_database_reset_protection():
    """Verify database reset requires explicit confirmation body."""
    # Empty body
    res = client.post("/api/database/reset", json={})
    assert res.status_code == 422

    # Invalid confirmation
    res = client.post("/api/database/reset", json={"confirm": "yes"})
    assert res.status_code == 400


def test_reviews_query_validation():
    """Verify query parameters on review explorer are validated."""
    # Invalid rating (out of range)
    res = client.get("/api/reviews?rating=99")
    assert res.status_code == 400

    # Invalid rating (non-numeric string)
    res = client.get("/api/reviews?rating=bad_rating")
    assert res.status_code == 400

    # Invalid game
    res = client.get("/api/reviews?game=fake_game")
    assert res.status_code == 400

    # Invalid date format
    res = client.get("/api/reviews?start_date=2026/08/19")
    assert res.status_code == 400

    res = client.get("/api/reviews?end_date=' OR 1=1--")
    assert res.status_code == 400

    # Limit out of bounds
    res = client.get("/api/reviews?limit=-1")
    assert res.status_code == 422

    res = client.get("/api/reviews?limit=50000")
    assert res.status_code == 422

    # Valid query with limit=0 (All) and limit=5000
    res = client.get("/api/reviews?limit=0")
    assert res.status_code == 200

    res = client.get("/api/reviews?limit=5000")
    assert res.status_code == 200

    res = client.get("/api/reviews?limit=10&rating=5&game=hitwicket&start_date=2026-01-01")
    assert res.status_code == 200


def test_stop_pipeline_endpoint():
    """Verify stop pipeline endpoint responds cleanly even when idle."""
    res = client.post("/api/pipeline/stop")
    assert res.status_code == 200
    assert "status" in res.json()
