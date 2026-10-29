import pytest
from app.services.forecast_service import ForecastService

@pytest.fixture(scope="module")
def forecast_svc():
    svc = ForecastService()
    svc.load_model()
    return svc

def test_forecast_short_sequence_rejected(forecast_svc):
    with pytest.raises(ValueError, match="Insufficient historical data"):
        forecast_svc.forecast_series(
            prices=[2400.0, 2450.0],
            last_date_str="2026-07-29",
            horizon=7
        )

def test_forecast_invalid_horizon_rejected(forecast_svc):
    with pytest.raises(ValueError, match="Invalid forecast horizon"):
        forecast_svc.forecast_series(
            prices=[2400.0] * 10,
            last_date_str="2026-07-29",
            horizon=45
        )

def test_model_is_frozen_pretrained_only(forecast_svc):
    """Asserts that no parameters are trainable (zero gradient calculation)."""
    assert forecast_svc.pipeline is not None
    trainable = [p for p in forecast_svc.pipeline.model.parameters() if p.requires_grad]
    assert len(trainable) == 0

def test_forecast_valid_inference(forecast_svc):
    prices = [2400.0, 2410.0, 2405.0, 2420.0, 2430.0, 2425.0, 2440.0]
    resp = forecast_svc.forecast_series(
        prices=prices,
        last_date_str="2026-07-29",
        horizon=7,
        commodity="Wheat",
        market="Kanpur APMC"
    )
    assert resp.forecast_horizon == 7
    assert len(resp.forecasts) == 7
    assert resp.latest_historical_price == 2440.0
    assert resp.latest_historical_date == "2026-07-29"
    # First forecast date must be 2026-07-30
    assert resp.forecasts[0].date == "2026-07-30"
    assert resp.forecasts[-1].date == "2026-08-05"

    # Quantile ordering checks: lower_10 <= median <= upper_90
    for fp in resp.forecasts:
        assert fp.lower_10 <= fp.median <= fp.upper_90

def test_forecast_multiple_horizons(forecast_svc):
    prices = [2400.0, 2410.0, 2405.0, 2420.0, 2430.0, 2425.0, 2440.0]
    for h in [1, 3, 7, 14]:
        resp = forecast_svc.forecast_series(
            prices=prices,
            last_date_str="2026-07-29",
            horizon=h,
            commodity="Wheat",
            market="Kanpur APMC"
        )
        assert resp.forecast_horizon == h
        assert len(resp.forecasts) == h
        assert resp.forecasts[0].lower_10 <= resp.forecasts[0].median <= resp.forecasts[0].upper_90
