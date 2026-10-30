from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = BASE_DIR / "app" / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR = BASE_DIR / "app" / "data" / "audio_cache"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI PriceSense"
    TAGLINE: str = "Smarter Agricultural Pricing Through AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Pretrained AI Model Constraint
    MODEL_ID: str = "amazon/chronos-bolt-small"
    DEVICE: str = "auto"  # 'auto', 'cuda', or 'cpu'
    
    # Forecasting configurations
    SUPPORTED_HORIZONS: List[int] = [1, 3, 7, 14]
    DEFAULT_HORIZON: int = 7
    QUANTILE_LEVELS: List[float] = [0.1, 0.5, 0.9]
    MIN_SEQUENCE_LENGTH: int = 3
    RECOMMENDED_SEQUENCE_LENGTH: int = 14
    
    # Dataset directories
    DATA_PATH: Path = DATA_DIR / "sample_mandi_prices.csv"
    DEMO_KANPUR_PATH: Path = DATA_DIR / "kanpur_wheat_demo.csv"
    UPLOAD_PATH: Path = UPLOAD_DIR
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",  # permissive for local dev
    ]
    
    # Upload limits
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    
    # Conversational AI (Gemini)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Voice Synthesis (ElevenLabs)
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_MODEL_ID: str = "eleven_flash_v2_5"
    
    # Audio Cache Directory
    AUDIO_DIR: Path = BASE_DIR / "app" / "data" / "audio_cache"
    
    model_config = SettingsConfigDict(
        env_file=[str(ROOT_DIR / ".env"), str(BASE_DIR / ".env"), ".env"],
        extra="ignore"
    )

settings = Settings()
