from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HistoricalPoint(BaseModel):
    date: str
    modal_price: float
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    is_interpolated: bool = False

class HistoricalSeriesResponse(BaseModel):
    state: str
    district: Optional[str] = None
    market: str
    commodity: str
    variety: Optional[str] = None
    grade: Optional[str] = None
    unit: str = "₹/quintal"
    data_points: List[HistoricalPoint]
    start_date: str
    end_date: str
    total_records: int
    unique_dates_count: int
    missing_dates_count: int
    missing_dates: List[str] = []
    has_gaps: bool
    is_interpolated: bool
    warnings: List[str] = []

class ForecastRequest(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    market: Optional[str] = None
    commodity: Optional[str] = None
    variety: Optional[str] = None
    grade: Optional[str] = None
    horizon: int = Field(default=7, ge=1, le=30)
    interpolate_missing: bool = False
    # Support direct sequence input for ad-hoc / sandbox testing
    custom_prices: Optional[List[float]] = None
    custom_dates: Optional[List[str]] = None

class ForecastPoint(BaseModel):
    date: str
    median: float
    lower_10: float
    upper_90: float
    mean: Optional[float] = None

class ForecastResponse(BaseModel):
    state: str
    district: Optional[str] = None
    market: str
    commodity: str
    variety: Optional[str] = None
    grade: Optional[str] = None
    latest_historical_date: str
    latest_historical_price: float
    forecast_horizon: int
    model_id: str
    generated_at: str
    unit: str = "₹/quintal"
    forecast_median_summary: float
    forecast_change_abs: float
    forecast_change_pct: float
    forecasts: List[ForecastPoint]
    historical_context: List[HistoricalPoint]
    data_quality_warnings: List[str] = []
    has_missing_dates: bool = False
    was_interpolated: bool = False

class ModelStatusResponse(BaseModel):
    model_id: str
    status: str  # 'READY', 'LOADING', 'ERROR', 'UNLOADED'
    device: str
    cuda_available: bool
    supported_horizons: List[int]
    quantiles: List[float]
    loaded_at: Optional[str] = None
    error_message: Optional[str] = None

class UploadResponse(BaseModel):
    status: str
    filename: str
    rows_total: int
    rows_accepted: int
    rows_rejected: int
    unique_dates: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    states_count: int
    markets_count: int
    commodities_count: int
    preview: List[Dict[str, Any]] = []
    warnings: List[str] = []

class FilterCascadingResponse(BaseModel):
    states: List[str]
    districts_by_state: Dict[str, List[str]]
    markets_by_district: Dict[str, List[str]]
    commodities_by_market: Dict[str, List[str]]
    varieties_by_commodity: Dict[str, List[str]] = {}
    grades_by_commodity: Dict[str, List[str]] = {}

class MarketSummaryItem(BaseModel):
    state: str
    district: Optional[str] = None
    market: str
    commodity: str
    latest_price: float
    latest_date: str
    avg_price: float
    price_min: float
    price_max: float
    record_count: int

class ForecastHistoryItem(BaseModel):
    id: str
    timestamp: str
    state: str
    market: str
    commodity: str
    horizon: int
    latest_price: float
    forecast_median: float
    change_pct: float

# Chat and Voice Assistant Schemas

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: str
    language: Optional[str] = "en"
    audio_url: Optional[str] = None
    data_context: Optional[Dict[str, Any]] = None
    tools_called: List[str] = []

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: str = "en"
    voice_gender: str = "female"
    enable_voice: bool = False
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    language: str
    detected_language: Optional[str] = None
    audio_url: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    tools_called: List[str] = []

class SpeechRequest(BaseModel):
    text: str
    language: str = "en"
    voice_gender: str = "female"
    voice_id: Optional[str] = None

class SpeechResponse(BaseModel):
    audio_url: str
    duration_seconds: Optional[float] = None
    voice_id: str
    language: str

class LanguageItem(BaseModel):
    code: str
    name: str
    native: str
    script: str
    sample_prompt: Optional[str] = None

class LanguagesResponse(BaseModel):
    languages: List[LanguageItem]
    default_language: str = "en"

class VoiceItem(BaseModel):
    voice_id: str
    name: str
    gender: str
    language: str

class VoicesResponse(BaseModel):
    voices: List[VoiceItem]

class VoicePreviewRequest(BaseModel):
    voice_id: Optional[str] = None
    language: str = "en"
    gender: str = "female"
    text: Optional[str] = None

class ChatHealthResponse(BaseModel):
    gemini_configured: bool
    gemini_model: str
    elevenlabs_configured: bool
    elevenlabs_model: str
    audio_cache_count: int

