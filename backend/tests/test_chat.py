import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.agricultural_tool_service import agricultural_tool_service
from app.services.chat_context_service import chat_context_service

client = TestClient(app)

def test_chat_health():
    response = client.get("/api/chat/health")
    assert response.status_code == 200
    data = response.json()
    assert "gemini_configured" in data
    assert "elevenlabs_configured" in data
    assert "gemini_model" in data

def test_get_languages():
    response = client.get("/api/chat/languages")
    assert response.status_code == 200
    data = response.json()
    assert "languages" in data
    langs = {l["code"]: l for l in data["languages"]}
    # Verify all 11 required languages
    required = ["en", "ta", "hi", "te", "kn", "ml", "bn", "mr", "gu", "pa", "ur"]
    for code in required:
        assert code in langs
        assert len(langs[code]["native"]) > 0

def test_get_voices():
    response = client.get("/api/chat/voices")
    assert response.status_code == 200
    data = response.json()
    assert "voices" in data
    assert len(data["voices"]) >= 2
    genders = [v["gender"] for v in data["voices"]]
    assert "female" in genders
    assert "male" in genders

def test_agricultural_tools():
    # Latest price
    res = agricultural_tool_service.get_latest_market_price(commodity="Wheat")
    assert res["status"] in ["success", "not_found"]
    if res["status"] == "success":
        assert "modal_price" in res
        assert res["modal_price"] > 0
        assert "date" in res

    # Dataset info
    info = agricultural_tool_service.get_dataset_information()
    assert info["status"] == "success"
    assert info["total_records"] > 0

    # Market comparison
    comp = agricultural_tool_service.compare_market_prices(commodity="Wheat")
    assert comp["status"] in ["success", "not_found"]

def test_chat_message_english_price():
    payload = {
        "message": "What is the latest wheat price in Kanpur?",
        "language": "en",
        "voice_gender": "female",
        "enable_voice": False
    }
    response = client.post("/api/chat/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
    assert "Wheat" in data["response"] or "wheat" in data["response"]
    assert "session_id" in data

def test_chat_message_hindi():
    payload = {
        "message": "गेहूं का ताजा मंडी भाव क्या है?",
        "language": "hi",
        "voice_gender": "female",
        "enable_voice": False
    }
    response = client.post("/api/chat/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert len(data["response"]) > 0

def test_chat_message_tamil():
    payload = {
        "message": "வெங்காயத்தின் விலை என்ன?",
        "language": "ta",
        "voice_gender": "female",
        "enable_voice": False
    }
    response = client.post("/api/chat/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "ta"
    assert len(data["response"]) > 0

def test_chat_context_retention():
    # Turn 1: Discuss Wheat in Kanpur
    payload1 = {
        "message": "What is the wheat price in Kanpur?",
        "language": "en"
    }
    resp1 = client.post("/api/chat/message", json=payload1)
    assert resp1.status_code == 200
    sid = resp1.json()["session_id"]

    # Turn 2: Follow-up question without naming commodity
    payload2 = {
        "message": "What is the forecast for next week?",
        "session_id": sid,
        "language": "en"
    }
    resp2 = client.post("/api/chat/message", json=payload2)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["session_id"] == sid
    # Context should have retained Wheat / Kanpur
    assert "Wheat" in data2["response"] or "forecast" in data2["response"].lower()

