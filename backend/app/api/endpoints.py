import io
import csv
import logging
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.api.schemas import (
    HistoricalSeriesResponse,
    ForecastRequest,
    ForecastResponse,
    ModelStatusResponse,
    UploadResponse,
    FilterCascadingResponse,
    MarketSummaryItem,
    ForecastHistoryItem
)
from app.services.data_service import data_service
from app.services.forecast_service import forecast_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION
    }

@router.get("/model/status", response_model=ModelStatusResponse)
def get_model_status():
    """Returns current status and device information of the Chronos model."""
    return forecast_service.get_status()

@router.post("/model/preload")
def preload_model():
    """Preloads the Chronos-Bolt Small model into memory."""
    try:
        forecast_service.load_model()
        return {"status": "SUCCESS", "message": "Pretrained Chronos model loaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    """
    Accepts CSV upload, validates columns, parses dates, normalizes prices,
    and updates active Mandi dataset.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")
        
    try:
        contents = await file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
            )
        
        # Save raw uploaded file to upload directory
        save_path = settings.UPLOAD_PATH / f"{file.filename}"
        with open(save_path, "wb") as f:
            f.write(contents)

        buffer = io.BytesIO(contents)
        response = data_service.load_csv_file(buffer, dataset_name=file.filename)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing CSV: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@router.get("/filters", response_model=FilterCascadingResponse)
def get_filters():
    """Returns cascading filter options for state -> district -> market -> commodity."""
    return data_service.get_filter_hierarchy()

@router.get("/markets")
def list_markets(state: Optional[str] = Query(None)):
    """Lists markets, optionally filtered by state."""
    if data_service.df is None or data_service.df.empty:
        return []
    df = data_service.df
    if state:
        df = df[df["state"].str.lower() == state.strip().lower()]
    return sorted(df["market"].dropna().unique().tolist())

@router.get("/commodities")
def list_commodities(market: Optional[str] = Query(None), state: Optional[str] = Query(None)):
    """Lists commodities, optionally filtered by market or state."""
    if data_service.df is None or data_service.df.empty:
        return []
    df = data_service.df
    if state:
        df = df[df["state"].str.lower() == state.strip().lower()]
    if market:
        df = df[df["market"].str.lower() == market.strip().lower()]
    return sorted(df["commodity"].dropna().unique().tolist())

@router.get("/historical", response_model=HistoricalSeriesResponse)
def get_historical_data(
    state: str = Query(..., description="Indian State"),
    market: str = Query(..., description="APMC Market"),
    commodity: str = Query(..., description="Commodity Name"),
    district: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    interpolate_missing: bool = Query(False, description="Explicitly interpolate missing dates")
):
    """
    Fetches historical price time series for a selected market & commodity.
    Aggregates duplicate daily records and reports missing calendar dates.
    """
    try:
        series = data_service.get_historical_series(
            state=state,
            market=market,
            commodity=commodity,
            district=district,
            variety=variety,
            grade=grade,
            start_date=start_date,
            end_date=end_date,
            interpolate_missing=interpolate_missing
        )
        return series
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching historical series: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forecast", response_model=ForecastResponse)
def generate_forecast(req: ForecastRequest):
    """
    Generates a 1, 3, 7, or 14-day price forecast with 10th-90th percentile
    uncertainty ranges using pretrained amazon/chronos-bolt-small.
    """
    try:
        # Check if direct custom series was passed
        if req.custom_prices and len(req.custom_prices) >= settings.MIN_SEQUENCE_LENGTH:
            last_dt = (
                req.custom_dates[-1]
                if req.custom_dates and len(req.custom_dates) == len(req.custom_prices)
                else "2026-07-29"
            )
            hist_context = []
            if req.custom_dates:
                for d, p in zip(req.custom_dates, req.custom_prices):
                    hist_context.append({"date": d, "modal_price": p, "is_interpolated": False})

            return forecast_service.forecast_series(
                prices=req.custom_prices,
                last_date_str=last_dt,
                horizon=req.horizon,
                state=req.state or "Custom Input",
                district=req.district,
                market=req.market or "Custom APMC",
                commodity=req.commodity or "Agricultural Commodity",
                variety=req.variety,
                grade=req.grade,
                historical_context=hist_context,
                has_missing_dates=False,
                was_interpolated=False
            )

        # Otherwise retrieve from active Mandi dataset
        if not (req.state and req.market and req.commodity):
            raise HTTPException(
                status_code=400,
                detail="State, market, and commodity are required when custom prices are not provided."
            )

        hist_series = data_service.get_historical_series(
            state=req.state,
            market=req.market,
            commodity=req.commodity,
            district=req.district,
            variety=req.variety,
            grade=req.grade,
            interpolate_missing=req.interpolate_missing
        )

        prices = [pt.modal_price for pt in hist_series.data_points]
        last_date = hist_series.end_date

        return forecast_service.forecast_series(
            prices=prices,
            last_date_str=last_date,
            horizon=req.horizon,
            state=req.state,
            district=req.district or hist_series.district,
            market=req.market,
            commodity=req.commodity,
            variety=req.variety or hist_series.variety,
            grade=req.grade or hist_series.grade,
            historical_context=hist_series.data_points,
            has_missing_dates=hist_series.has_gaps,
            was_interpolated=hist_series.is_interpolated,
            input_warnings=hist_series.warnings
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        logger.error(f"Error generating forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {str(e)}")

@router.get("/forecast/history", response_model=List[ForecastHistoryItem])
def get_forecast_history():
    """Returns past forecast requests and summaries from this session."""
    return forecast_service.get_history()

@router.get("/market-explorer/summary", response_model=List[MarketSummaryItem])
def get_market_summaries():
    """Returns summaries for all available APMC markets and commodities."""
    return data_service.get_market_summaries()

@router.get("/export/forecast.csv")
def export_forecast_csv(
    state: str = Query(...),
    market: str = Query(...),
    commodity: str = Query(...),
    horizon: int = Query(7),
    interpolate_missing: bool = Query(False)
):
    """
    Exports combined historical and model forecast sequence as an RFC 4180 CSV file.
    """
    try:
        hist_series = data_service.get_historical_series(
            state=state,
            market=market,
            commodity=commodity,
            interpolate_missing=interpolate_missing
        )
        prices = [pt.modal_price for pt in hist_series.data_points]
        forecast_resp = forecast_service.forecast_series(
            prices=prices,
            last_date_str=hist_series.end_date,
            horizon=horizon,
            state=state,
            district=hist_series.district,
            market=market,
            commodity=commodity,
            historical_context=hist_series.data_points,
            has_missing_dates=hist_series.has_gaps,
            was_interpolated=hist_series.is_interpolated
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "series_type", "date", "state", "district", "market", "commodity",
            "price_modal", "price_lower_10", "price_median_50", "price_upper_90", "price_mean",
            "unit", "is_interpolated", "model_id"
        ])

        for hp in hist_series.data_points:
            writer.writerow([
                "HISTORICAL", hp.date, state, hist_series.district, market, commodity,
                hp.modal_price, "", "", "", "",
                "₹/quintal", hp.is_interpolated, ""
            ])

        for fp in forecast_resp.forecasts:
            writer.writerow([
                "FORECAST", fp.date, state, hist_series.district, market, commodity,
                "", fp.lower_10, fp.median, fp.upper_90, fp.mean or "",
                "₹/quintal", False, settings.MODEL_ID
            ])

        output.seek(0)
        filename = f"pricesense_{commodity}_{market}_{horizon}d.csv".replace(" ", "_").lower()
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error generating CSV export: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
