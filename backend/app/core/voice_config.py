from typing import Dict, Any, List

# Supported 11 Indian Languages
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English", "script": "Latn"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी", "script": "Deva"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்", "script": "Taml"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు", "script": "Telu"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ", "script": "Knda"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം", "script": "Mlym"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা", "script": "Beng"},
    {"code": "mr", "name": "Marathi", "native": "मराठी", "script": "Deva"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી", "script": "Gujr"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "script": "Guru"},
    {"code": "ur", "name": "Urdu", "native": "اردو", "script": "Arab"}
]

# Verified high quality ElevenLabs Voice IDs for Multilingual v2 / Flash v2.5
# Default verified voices:
# Female:
#   Rachel (21m00Tcm4TlvDq8ikWAM) - Warm, clear, natural conversational
#   Bella (EXAVITQu4vr4xnSDxMaL) - Soft, expressive
#   Sarah (EXAVITQu4vr4xnSDxMaL / pMsXgvxPnnzPL4FsGHRm)
# Male:
#   Adam (pNInz6obpgDQGcFmaJgB) - Deep, resonant, clear
#   Antoni (ErXwobaYiN019PkySvjV) - Well-paced, informative
#   Brian (nPczCjzI2devNBz1zQrb) - Friendly, narrator tone

DEFAULT_VOICE_MAP: Dict[str, Dict[str, str]] = {
    "female": {
        "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel
        "name": "Rachel (Conversational & Warm)",
        "gender": "female"
    },
    "male": {
        "voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam
        "name": "Adam (Clear & Professional)",
        "gender": "male"
    }
}

# Per-language voice recommendations (with global fallbacks)
LANGUAGE_VOICES: Dict[str, Dict[str, Dict[str, str]]] = {
    lang["code"]: {
        "female": {
            "voice_id": "21m00Tcm4TlvDq8ikWAM",
            "name": f"Rachel ({lang['name']} Female)",
            "gender": "female"
        },
        "male": {
            "voice_id": "pNInz6obpgDQGcFmaJgB",
            "name": f"Adam ({lang['name']} Male)",
            "gender": "male"
        }
    }
    for lang in SUPPORTED_LANGUAGES
}

def resolve_voice_id(language: str = "en", gender: str = "female") -> Dict[str, str]:
    """Resolves the appropriate voice ID and metadata given language and gender preference."""
    lang_code = language.strip().lower() if language else "en"
    g = gender.strip().lower() if gender else "female"
    if g not in ["female", "male"]:
        g = "female"
        
    lang_dict = LANGUAGE_VOICES.get(lang_code, {})
    if g in lang_dict:
        return lang_dict[g]
    return DEFAULT_VOICE_MAP.get(g, DEFAULT_VOICE_MAP["female"])
