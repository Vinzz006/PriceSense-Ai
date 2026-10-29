import io
import pytest
import pandas as pd
from app.services.data_service import DataService

@pytest.fixture
def data_svc():
    return DataService()

def test_normalize_columns(data_svc):
    raw = pd.DataFrame({
        "Arrival_Date": ["2026-07-01"],
        "State_Name": ["Uttar Pradesh"],
        "District_Name": ["Kanpur"],
        "Market_Center": ["Kanpur(Grain) APMC"],
        "Commodity_Name": ["Wheat"],
        "Variety_Name": ["Dara"],
        "Grade_Name": ["FAQ"],
        "Min_x0020_Price": [2400.0],
        "Max_x0020_Price": [2500.0],
        "Modal_x0020_Price": [2450.0]
    })
    cleaned = data_svc.normalize_column_names(raw)
    assert "date" in cleaned.columns
    assert "state" in cleaned.columns
    assert "market" in cleaned.columns
    assert "commodity" in cleaned.columns
    assert "modal_price" in cleaned.columns

def test_parse_and_validate_rejects_missing_cols(data_svc):
    raw = pd.DataFrame({"state": ["UP"], "market": ["Kanpur"]})
    with pytest.raises(ValueError, match="CSV missing mandatory column"):
        data_svc.parse_and_validate_dataframe(raw)

def test_parse_and_validate_rejects_nonpositive_prices(data_svc):
    raw = pd.DataFrame({
        "date": ["2026-07-01", "2026-07-02", "2026-07-03"],
        "state": ["UP", "UP", "UP"],
        "market": ["Kanpur", "Kanpur", "Kanpur"],
        "commodity": ["Wheat", "Wheat", "Wheat"],
        "modal_price": [2400.0, -100.0, 0.0]
    })
    cleaned, total, rejected, warnings = data_svc.parse_and_validate_dataframe(raw)
    assert total == 3
    assert len(cleaned) == 1
    assert rejected == 2
    assert any("invalid or non-positive modal prices" in w for w in warnings)

def test_duplicate_dates_aggregation(data_svc):
    raw = pd.DataFrame({
        "date": ["2026-07-01", "2026-07-01", "2026-07-02"],
        "state": ["UP", "UP", "UP"],
        "district": ["Kanpur", "Kanpur", "Kanpur"],
        "market": ["Kanpur APMC", "Kanpur APMC", "Kanpur APMC"],
        "commodity": ["Wheat", "Wheat", "Wheat"],
        "variety": ["Dara", "Desi", "Dara"],
        "grade": ["FAQ", "FAQ", "FAQ"],
        "modal_price": [2400.0, 2450.0, 2460.0]
    })
    buf = io.StringIO(raw.to_csv(index=False))
    data_svc.load_csv_file(buf, "test_dup")
    
    series = data_svc.get_historical_series("UP", "Kanpur APMC", "Wheat")
    assert series.total_records == 3
    assert series.unique_dates_count == 2
    # Mean of 2400 and 2450 is 2425.0
    first_pt = series.data_points[0]
    assert first_pt.date == "2026-07-01"
    assert first_pt.modal_price == 2425.0

def test_missing_dates_detection_and_interpolation(data_svc):
    raw = pd.DataFrame({
        "date": ["2026-07-01", "2026-07-04"],  # 2 missing days: 2nd and 3rd
        "state": ["UP", "UP"],
        "district": ["Kanpur", "Kanpur"],
        "market": ["Kanpur APMC", "Kanpur APMC"],
        "commodity": ["Wheat", "Wheat"],
        "modal_price": [2400.0, 2430.0]
    })
    buf = io.StringIO(raw.to_csv(index=False))
    data_svc.load_csv_file(buf, "test_gaps")

    # Without interpolation: 2 points, reports 2 missing dates
    series_raw = data_svc.get_historical_series("UP", "Kanpur APMC", "Wheat", interpolate_missing=False)
    assert series_raw.has_gaps is True
    assert series_raw.missing_dates_count == 2
    assert len(series_raw.data_points) == 2
    assert series_raw.is_interpolated is False

    # With interpolation: 4 points, linear interpolation between 2400 and 2430
    series_interp = data_svc.get_historical_series("UP", "Kanpur APMC", "Wheat", interpolate_missing=True)
    assert series_interp.is_interpolated is True
    assert len(series_interp.data_points) == 4
    # Points on 2026-07-02 and 2026-07-03 should be marked interpolated
    assert series_interp.data_points[1].is_interpolated is True
    assert series_interp.data_points[2].is_interpolated is True
    assert series_interp.data_points[1].modal_price == 2410.0
    assert series_interp.data_points[2].modal_price == 2420.0
