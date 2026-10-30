import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class ChatSession:
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.created_at: float = time.time()
        self.updated_at: float = time.time()
        self.messages: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {
            "state": "Uttar Pradesh",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Wheat",
            "variety": None,
            "grade": None
        }

    def update_context(self, new_context: Optional[Dict[str, Any]] = None):
        if not new_context:
            return
        for k, v in new_context.items():
            if v is not None and str(v).strip():
                self.context[k] = v
        self.updated_at = time.time()

    def add_message(
        self,
        role: str,
        content: str,
        language: str = "en",
        audio_url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        tools_called: Optional[List[str]] = None
    ):
        msg = {
            "id": str(uuid.uuid4()),
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "language": language,
            "audio_url": audio_url,
            "data": data,
            "tools_called": tools_called or []
        }
        self.messages.append(msg)
        # Keep last 25 messages per session
        if len(self.messages) > 25:
            self.messages = self.messages[-25:]
        self.updated_at = time.time()

class ChatContextService:
    def __init__(self, ttl_seconds: int = 3600 * 24):
        self.sessions: Dict[str, ChatSession] = {}
        self.ttl_seconds: int = ttl_seconds

    def get_or_create_session(self, session_id: Optional[str] = None) -> ChatSession:
        self._cleanup_expired()
        if not session_id or session_id not in self.sessions:
            new_id = session_id or str(uuid.uuid4())
            session = ChatSession(new_id)
            self.sessions[new_id] = session
            return session
        return self.sessions[session_id]

    def _cleanup_expired(self):
        now = time.time()
        expired = [sid for sid, s in self.sessions.items() if now - s.updated_at > self.ttl_seconds]
        for sid in expired:
            del self.sessions[sid]

chat_context_service = ChatContextService()
