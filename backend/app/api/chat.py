import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.voice_config import SUPPORTED_LANGUAGES, LANGUAGE_VOICES, DEFAULT_VOICE_MAP
from app.api.schemas import (
    ChatRequest,
    ChatResponse,
    SpeechRequest,
    SpeechResponse,
    LanguagesResponse,
    LanguageItem,
    VoicesResponse,
    VoiceItem,
    VoicePreviewRequest,
    ChatHealthResponse
)
from app.services.gemini_service import gemini_service
from app.services.elevenlabs_service import elevenlabs_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health", response_model=ChatHealthResponse)
def get_chat_health():
    """Returns status of AI conversational engine and ElevenLabs TTS."""
    audio_files = list(settings.AUDIO_DIR.glob("*.mp3"))
    return ChatHealthResponse(
        gemini_configured=gemini_service.is_configured(),
        gemini_model=gemini_service.model_name,
        elevenlabs_configured=elevenlabs_service.is_configured(),
        elevenlabs_model=elevenlabs_service.model_id,
        audio_cache_count=len(audio_files)
    )

@router.get("/languages", response_model=LanguagesResponse)
def get_supported_languages():
    """Returns all 11 supported Indian languages with native scripts."""
    items = []
    for l in SUPPORTED_LANGUAGES:
        sample = {
            "en": "What is the 7-day wheat price forecast?",
            "hi": "गेहूं का 7 दिनों का पूर्वानुमान बताओ।",
            "ta": "கோதுமையின் 7 நாள் விலை முன்னறிவிப்பு என்ன?",
            "te": "గోధుమల 7 రోజుల ధరల అంచనా ఏమిటి?",
            "kn": "ಗೋಧಿ 7 ದಿನಗಳ ಬೆಲೆ ಮುನ್ಸೂಚನೆ ಏನು?",
            "ml": "ഗോതമ്പിന്റെ 7 ദിവസത്തെ വില പ്രവചനം എന്താണ്?",
            "bn": "গমের ৭ দিনের দামের পূর্বাভাস কি?",
            "mr": "गव्हाचा ७ दिवसांचा भाव अंदाज सांगा.",
            "gu": "ઘઉંનો 7 દિવસનો ભાવ અનુમાન શું છે?",
            "pa": "ਕਣਕ ਦਾ 7 ਦਿਨਾਂ ਦਾ ਮੁੱਲ ਪੂਰਵ-ਅਨੁਮਾਨ ਕੀ ਹੈ?",
            "ur": "گندم کی 7 دن کی قیمت کی پیشن گوئی کیا ہے؟"
        }.get(l["code"], "What is the commodity forecast?")
        
        items.append(LanguageItem(
            code=l["code"],
            name=l["name"],
            native=l["native"],
            script=l["script"],
            sample_prompt=sample
        ))
    return LanguagesResponse(languages=items, default_language="en")

@router.get("/voices", response_model=VoicesResponse)
def get_available_voices():
    """Lists available ElevenLabs voices across supported languages and genders."""
    items = []
    # Add female and male options
    items.append(VoiceItem(
        voice_id=DEFAULT_VOICE_MAP["female"]["voice_id"],
        name=DEFAULT_VOICE_MAP["female"]["name"],
        gender="female",
        language="multilingual"
    ))
    items.append(VoiceItem(
        voice_id=DEFAULT_VOICE_MAP["male"]["voice_id"],
        name=DEFAULT_VOICE_MAP["male"]["name"],
        gender="male",
        language="multilingual"
    ))
    return VoicesResponse(voices=items)

@router.post("/message", response_model=ChatResponse)
def send_chat_message(request: ChatRequest):
    """
    Main conversational chat endpoint:
    Processes user query in requested or detected language,
    invokes agricultural forecasting/price tools,
    and optionally synthesizes voice output using ElevenLabs.
    """
    try:
        # Process message with Gemini / Grounded agricultural engine
        result = gemini_service.process_message(
            message=request.message,
            session_id=request.session_id,
            language=request.language,
            context=request.context
        )

        audio_url = None
        # If voice output is requested, synthesize audio
        if request.enable_voice:
            speech_res = elevenlabs_service.synthesize_speech(
                text=result["response"],
                language=result["language"],
                gender=request.voice_gender
            )
            audio_url = speech_res.get("audio_url")

        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
            language=result["language"],
            detected_language=result.get("detected_language"),
            audio_url=audio_url,
            data=result.get("data"),
            tools_called=result.get("tools_called", [])
        )
    except Exception as e:
        logger.error(f"Error handling chat message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/speech", response_model=SpeechResponse)
def generate_speech(request: SpeechRequest):
    """Generates audio speech for a specific text snippet using ElevenLabs."""
    res = elevenlabs_service.synthesize_speech(
        text=request.text,
        language=request.language,
        gender=request.voice_gender,
        voice_id=request.voice_id
    )

    if not res.get("audio_url"):
        raise HTTPException(
            status_code=400 if "empty" in str(res.get("error", "")).lower() else 503,
            detail=res.get("message") or res.get("error") or "Voice synthesis failed."
        )

    return SpeechResponse(
        audio_url=res["audio_url"],
        voice_id=res["voice_id"],
        language=res["language"]
    )

@router.post("/voice-preview")
def preview_voice(request: VoicePreviewRequest):
    """Generates a short voice preview audio sample."""
    sample_text = request.text or (
        "Hello! I am PriceSense AI Assistant. Smarter Agricultural Pricing Through AI."
        if request.language == "en" else "नमस्कार! मैं PriceSense AI सहायक हूँ।"
    )
    res = elevenlabs_service.synthesize_speech(
        text=sample_text,
        language=request.language,
        gender=request.gender,
        voice_id=request.voice_id
    )
    return res

@router.get("/audio/{filename}")
def stream_audio(filename: str):
    """Streams cached MP3 audio files to the browser."""
    if not filename.endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
    
    file_path = elevenlabs_service.get_cached_file(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(path=file_path, media_type="audio/mpeg", filename=filename)
