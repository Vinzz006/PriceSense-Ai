import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_service import data_service

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "AI PriceSense"

def test_model_status_endpoint():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_id" in data
    assert "device" in data
    assert "supported_horizons" in data

def test_filters_endpoint():
    response = client.get("/api/filters")
    assert response.status_code == 200
    data = response.json()
    assert "states" in data
    assert "markets_by_district" in data
    assert "commodities_by_market" in data

def test_historical_endpoint():
    # Uttar Pradesh -> Kanpur(Grain) APMC -> Wheat
    response = client.get(
        "/api/historical",
        params={
            "state": "Uttar Pradesh",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Wheat"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["market"] == "Kanpur(Grain) APMC"
    assert data["commodity"] == "Wheat"
    assert len(data["data_points"]) > 0
    assert data["unit"] == "₹/quintal"

def test_forecast_endpoint():
    payload = {
        "state": "Uttar Pradesh",
        "market": "Kanpur(Grain) APMC",
        "commodity": "Wheat",
        "horizon": 7,
        "interpolate_missing": True
    }
    response = client.post("/api/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["forecast_horizon"] == 7
    assert len(data["forecasts"]) == 7
    assert data["unit"] == "₹/quintal"
    assert data["forecasts"][0]["lower_10"] <= data["forecasts"][0]["median"] <= data["forecasts"][0]["upper_90"]

def test_csv_upload_endpoint():
    csv_content = """date,state,district,market,commodity,variety,grade,min_price,max_price,modal_price
2026-07-01,Punjab,Ludhiana,Khanna APMC,Wheat,PBW-502,FAQ,2400,2500,2450
2026-07-02,Punjab,Ludhiana,Khanna APMC,Wheat,PBW-502,FAQ,2410,2510,2460
2026-07-03,Punjab,Ludhiana,Khanna APMC,Wheat,PBW-502,FAQ,2420,2520,2470
"""
    files = {"file": ("test_mandi.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/data/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["rows_accepted"] == 3
    assert data["states_count"] >= 1

def test_csv_export_endpoint():
    # Reload default data or use the uploaded Punjab dataset
    data_service._load_initial_data()
    response = client.get(
        "/api/export/forecast.csv",
        params={
            "state": "Uttar Pradesh",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Wheat",
            "horizon": 7
        }
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    content = response.text
    assert "series_type,date,state" in content
    assert "HISTORICAL" in content
    assert "FORECAST" in content
