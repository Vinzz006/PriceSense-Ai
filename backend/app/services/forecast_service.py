import time
import uuid
import logging
import threading
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone

import torch
import numpy as np
import pandas as pd
from chronos import BaseChronosPipeline

from app.core.config import settings
from app.api.schemas import (
    ForecastPoint,
    ForecastResponse,
    HistoricalPoint,
    ModelStatusResponse,
    ForecastHistoryItem
)

logger = logging.getLogger(__name__)

class ForecastService:
    def __init__(self):
        self.pipeline: Optional[Any] = None
        self.model_status: str = "UNLOADED"  # UNLOADED, LOADING, READY, ERROR
        self.device: str = "cpu"
        self.error_message: Optional[str] = None
        self.loaded_at: Optional[str] = None
        self._lock = threading.Lock()
        self.history: List[ForecastHistoryItem] = []
        
        # Determine target device
        if settings.DEVICE == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = settings.DEVICE

    def load_model(self) -> None:
        """Loads pretrained amazon/chronos-bolt-small into memory if not loaded."""
        if self.model_status == "READY" and self.pipeline is not None:
            return

        with self._lock:
            if self.model_status == "READY" and self.pipeline is not None:
                return
            
            self.model_status = "LOADING"
            self.error_message = None
            logger.info(f"Loading pretrained Chronos model: {settings.MODEL_ID} on device: {self.device}")
            try:
                # Load pretrained Chronos-Bolt Small
                self.pipeline = BaseChronosPipeline.from_pretrained(
                    settings.MODEL_ID,
                    device_map=self.device
                )
                self.model_status = "READY"
                self.loaded_at = datetime.now(timezone.utc).isoformat()
                logger.info(f"Successfully loaded {settings.MODEL_ID} into memory on {self.device}")
            except Exception as e:
                self.model_status = "ERROR"
                self.error_message = str(e)
                logger.error(f"Failed to load Chronos model: {e}", exc_info=True)
                raise RuntimeError(f"Failed to load model {settings.MODEL_ID}: {str(e)}")

    def get_status(self) -> ModelStatusResponse:
        """Returns current model status and hardware details."""
        return ModelStatusResponse(
            model_id=settings.MODEL_ID,
            status=self.model_status,
            device=self.device,
            cuda_available=torch.cuda.is_available(),
            supported_horizons=settings.SUPPORTED_HORIZONS,
            quantiles=settings.QUANTILE_LEVELS,
            loaded_at=self.loaded_at,
            error_message=self.error_message
        )

    def forecast_series(
        self,
        prices: List[float],
        last_date_str: str,
        horizon: int = 7,
        state: str = "Custom",
        district: Optional[str] = None,
        market: str = "Custom",
        commodity: str = "Commodity",
        variety: Optional[str] = None,
        grade: Optional[str] = None,
        historical_context: Optional[List[HistoricalPoint]] = None,
        has_missing_dates: bool = False,
        was_interpolated: bool = False,
        input_warnings: Optional[List[str]] = None
    ) -> ForecastResponse:
        """
        Executes real inference through amazon/chronos-bolt-small.
        Returns quantiles (0.1, 0.5, 0.9) and mean forecast.
        """
        if horizon not in settings.SUPPORTED_HORIZONS and not (1 <= horizon <= 30):
            raise ValueError(f"Invalid forecast horizon {horizon}. Supported horizons: {settings.SUPPORTED_HORIZONS}")

        if not prices or len(prices) < settings.MIN_SEQUENCE_LENGTH:
            raise ValueError(
                f"Insufficient historical data: provided {len(prices) if prices else 0} observations. "
                f"At least {settings.MIN_SEQUENCE_LENGTH} observations are required."
            )

        # Validate numeric array
        arr = np.array(prices, dtype=np.float32)
        if np.isnan(arr).any() or np.isinf(arr).any():
            raise ValueError("Input price sequence contains NaN or infinite values.")

        warnings = list(input_warnings or [])
        if len(prices) < settings.RECOMMENDED_SEQUENCE_LENGTH:
            warnings.append(
                f"Short historical series ({len(prices)} observations). "
                f"Chronos performs best with at least {settings.RECOMMENDED_SEQUENCE_LENGTH} points."
            )

        # Ensure model is loaded
        if self.pipeline is None or self.model_status != "READY":
            self.load_model()

        # Build PyTorch context tensor
        context = torch.tensor(arr, dtype=torch.float32)

        # Execute model inference with thread lock
        with self._lock:
            try:
                # The model API uses inputs=context and quantile_levels
                res = self.pipeline.predict_quantiles(
                    inputs=context,
                    prediction_length=horizon,
                    quantile_levels=settings.QUANTILE_LEVELS
                )
            except Exception as e:
                logger.error(f"Inference error with Chronos: {e}", exc_info=True)
                raise RuntimeError(f"Chronos inference failed: {str(e)}")

        # Normalize outputs robustly
        if isinstance(res, tuple):
            quantiles_tensor, mean_tensor = res
        else:
            quantiles_tensor, mean_tensor = res, None

        # Squeeze batch dimension if present
        # Target shape for quantiles: (horizon, 3)
        if quantiles_tensor.ndim == 3:
            quantiles_tensor = quantiles_tensor[0]
        elif quantiles_tensor.ndim != 2:
            raise ValueError(f"Unexpected quantiles tensor shape from model: {quantiles_tensor.shape}")

        if mean_tensor is not None:
            if mean_tensor.ndim == 2:
                mean_tensor = mean_tensor[0]
            elif mean_tensor.ndim != 1:
                mean_tensor = None

        quantiles_np = quantiles_tensor.detach().cpu().numpy()
        mean_np = mean_tensor.detach().cpu().numpy() if mean_tensor is not None else None

        # Generate future forecast dates
        last_dt = pd.to_datetime(last_date_str)
        forecast_points: List[ForecastPoint] = []
        for i in range(horizon):
            f_date = (last_dt + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            low_10 = round(float(quantiles_np[i, 0]), 2)
            med_50 = round(float(quantiles_np[i, 1]), 2)
            upp_90 = round(float(quantiles_np[i, 2]), 2)
            mean_val = round(float(mean_np[i]), 2) if mean_np is not None else None

            forecast_points.append(ForecastPoint(
                date=f_date,
                median=med_50,
                lower_10=low_10,
                upper_90=upp_90,
                mean=mean_val
            ))

        latest_price = round(float(prices[-1]), 2)
        # Median forecast of the first upcoming day
        first_forecast_median = forecast_points[0].median
        forecast_change_abs = round(first_forecast_median - latest_price, 2)
        forecast_change_pct = round((forecast_change_abs / latest_price) * 100.0, 2) if latest_price > 0 else 0.0

        # Construct response
        response = ForecastResponse(
            state=state,
            district=district,
            market=market,
            commodity=commodity,
            variety=variety,
            grade=grade,
            latest_historical_date=last_date_str,
            latest_historical_price=latest_price,
            forecast_horizon=horizon,
            model_id=settings.MODEL_ID,
            generated_at=datetime.now(timezone.utc).isoformat(),
            unit="₹/quintal",
            forecast_median_summary=first_forecast_median,
            forecast_change_abs=forecast_change_abs,
            forecast_change_pct=forecast_change_pct,
            forecasts=forecast_points,
            historical_context=historical_context or [],
            data_quality_warnings=warnings,
            has_missing_dates=has_missing_dates,
            was_interpolated=was_interpolated
        )

        # Store in forecast history
        history_entry = ForecastHistoryItem(
            id=str(uuid.uuid4())[:8],
            timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            state=state,
            market=market,
            commodity=commodity,
            horizon=horizon,
            latest_price=latest_price,
            forecast_median=first_forecast_median,
            change_pct=forecast_change_pct
        )
        self.history.insert(0, history_entry)
        if len(self.history) > 100:
            self.history.pop()

        return response

    def get_history(self) -> List[ForecastHistoryItem]:
        return self.history

forecast_service = ForecastService()
