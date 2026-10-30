import os
import io
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.voice_config import resolve_voice_id, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

class ElevenLabsService:
    """
    Integrates official ElevenLabs Text-to-Speech API for multilingual voice synthesis.
    Caches generated MP3 files locally to avoid duplicate API requests.
    Gracefully degrades with helpful status when ELEVENLABS_API_KEY is omitted.
    """

    def __init__(self):
        self.api_key: Optional[str] = settings.ELEVENLABS_API_KEY or os.environ.get("ELEVENLABS_API_KEY")
        self.model_id: str = settings.ELEVENLABS_MODEL_ID or "eleven_flash_v2_5"
        self.cache_dir: Path = settings.AUDIO_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from elevenlabs.client import ElevenLabs
                self._client = ElevenLabs(api_key=self.api_key)
                logger.info("ElevenLabs client initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize ElevenLabs client: {e}")
                self._client = None

    def is_configured(self) -> bool:
        return bool(self.api_key and self._client is not None)

    def _generate_cache_key(self, text: str, voice_id: str, model_id: str) -> str:
        raw = f"{voice_id}:{model_id}:{text.strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def synthesize_speech(
        self,
        text: str,
        language: str = "en",
        gender: str = "female",
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes speech using ElevenLabs and writes MP3 file to local cache.
        Returns: { "audio_url": str, "voice_id": str, "language": str }
        """
        clean_text = text.strip()
        if not clean_text:
            return {"error": "Text is empty", "audio_url": None}

        # Truncate overly long text for speech (limit to first 500 chars for snappy responses)
        if len(clean_text) > 500:
            clean_text = clean_text[:497] + "..."

        # Resolve voice
        resolved = resolve_voice_id(language=language, gender=gender)
        chosen_voice_id = voice_id or resolved["voice_id"]

        # Check local cache first
        cache_key = self._generate_cache_key(clean_text, chosen_voice_id, self.model_id)
        mp3_filename = f"{cache_key}.mp3"
        cached_file = self.cache_dir / mp3_filename

        if cached_file.exists():
            return {
                "audio_url": f"/api/chat/audio/{mp3_filename}",
                "voice_id": chosen_voice_id,
                "language": language,
                "cached": True
            }

        # If API key is not configured, report gracefully
        if not self.is_configured():
            logger.info("ElevenLabs API key not configured; skipping remote audio synthesis.")
            return {
                "audio_url": None,
                "voice_id": chosen_voice_id,
                "language": language,
                "message": "ElevenLabs API key not configured in environment. Voice synthesis disabled."
            }

        try:
            # Generate audio via ElevenLabs client
            audio_generator = self._client.text_to_speech.convert(
                text=clean_text,
                voice_id=chosen_voice_id,
                model_id=self.model_id,
                output_format="mp3_44100_128"
            )

            # Write stream to cached file
            with open(cached_file, "wb") as f:
                for chunk in audio_generator:
                    f.write(chunk)

            logger.info(f"Generated new audio file {mp3_filename} via ElevenLabs")
            return {
                "audio_url": f"/api/chat/audio/{mp3_filename}",
                "voice_id": chosen_voice_id,
                "language": language,
                "cached": False
            }
        except Exception as e:
            logger.error(f"ElevenLabs TTS synthesis failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "audio_url": None,
                "voice_id": chosen_voice_id,
                "language": language
            }

    def get_cached_file(self, filename: str) -> Optional[Path]:
        target = self.cache_dir / filename
        if target.exists() and target.is_file():
            return target
        return None

elevenlabs_service = ElevenLabsService()
