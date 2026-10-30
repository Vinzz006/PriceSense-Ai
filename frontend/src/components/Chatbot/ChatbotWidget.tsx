import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Trash2,
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
} from 'lucide-react';
import type { ChatMessage, LanguageItem, VoiceItem, ChatHealth } from '../../types';
import { api } from '../../services/api';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatSettingsModal } from './ChatSettingsModal';

interface ChatbotWidgetProps {
  currentContext?: {
    state?: string;
    market?: string;
    commodity?: string;
  };
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ currentContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [enableVoice, setEnableVoice] = useState<boolean>(false);

  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [health, setHealth] = useState<ChatHealth | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePlayingAudioUrl, setActivePlayingAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load languages and health on mount
  useEffect(() => {
    const initChat = async () => {
      try {
        const [langRes, healthRes] = await Promise.all([
          api.getChatLanguages().catch(() => ({ languages: [], default_language: 'en' })),
          api.getChatHealth().catch(() => null),
        ]);
        if (langRes.languages.length > 0) {
          setLanguages(langRes.languages);
        }
        if (healthRes) {
          setHealth(healthRes);
        }
      } catch (err) {
        console.warn('Could not initialize chat metadata:', err);
      }
    };
    initChat();
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMap: Record<string, string> = {
        en: `👋 Hello! I am **PriceSense AI Assistant**, your intelligent agricultural forecasting partner.\n\nI can help you check latest Mandi prices, run **Chronos-Bolt Small** 7-day forecasts, and compare markets across India. How can I help you today?`,
        hi: `👋 नमस्कार! मैं **PriceSense AI सहायक** हूँ।\n\nमैं आपको ताजा मंडी भाव, **Chronos-Bolt Small** 7-दिवसीय मूल्य पूर्वानुमान, और मंडियों की तुलना करने में सहायता कर सकता हूँ। आज आप क्या जानना चाहते हैं?`,
        ta: `👋 வணக்கம்! நான் **PriceSense AI உதவியாளர்**.\n\nசமீபத்திய மண்டி விலைகள், **Chronos-Bolt Small** 7-நாள் விலை முன்னறிவிப்புகள் மற்றும் சந்தை ஒப்பீடுகளை அறிய நான் உங்களுக்கு உதவ முடியும். இன்று உங்களுக்கு எவ்வாறு உதவட்டும்?`,
      };

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeMap[selectedLanguage] || welcomeMap.en,
          timestamp: new Date().toISOString(),
          language: selectedLanguage,
        },
      ]);
    }
  }, [selectedLanguage]);

  // Audio Playback Manager
  const playAudio = async (text: string, existingAudioUrl?: string | null) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setActivePlayingAudioUrl(null);
      }

      let audioUrl = existingAudioUrl;
      if (!audioUrl) {
        // Request on-demand TTS
        const speechRes = await api.generateSpeech({
          text,
          language: selectedLanguage,
          voice_gender: voiceGender,
        });
        audioUrl = speechRes.audio_url;
      }

      if (audioUrl) {
        const fullUrl = audioUrl.startsWith('http')
          ? audioUrl
          : `http://localhost:8000${audioUrl}`;
        const audio = new Audio(fullUrl);
        audioPlayerRef.current = audio;
        setActivePlayingAudioUrl(audioUrl);

        audio.onended = () => setActivePlayingAudioUrl(null);
        audio.onerror = () => setActivePlayingAudioUrl(null);
        await audio.play();
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
      setActivePlayingAudioUrl(null);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setActivePlayingAudioUrl(null);
    }
  };

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
      language: selectedLanguage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage({
        message: userText,
        session_id: sessionId,
        language: selectedLanguage,
        voice_gender: voiceGender,
        enable_voice: enableVoice,
        context: currentContext,
      });

      setSessionId(res.session_id);

      const assistantMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toISOString(),
        language: res.language,
        audio_url: res.audio_url,
        data: res.data,
        tools_called: res.tools_called,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If voice is enabled and audio was returned, play it automatically
      if (enableVoice && res.audio_url) {
        playAudio(res.response, res.audio_url);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue: ${err.message || 'Could not communicate with the agricultural AI service.'}`,
        timestamp: new Date().toISOString(),
        language: selectedLanguage,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    stopAudio();
    setSessionId(undefined);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `Conversation cleared. How can I help you with agricultural pricing and forecasts?`,
        timestamp: new Date().toISOString(),
        language: selectedLanguage,
      },
    ]);
  };

  return (
    <>
      {/* Settings Modal */}
      <ChatSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={(l) => setSelectedLanguage(l)}
        voiceGender={voiceGender}
        onSelectVoiceGender={(g) => setVoiceGender(g)}
        enableVoice={enableVoice}
        onToggleVoice={(v) => setEnableVoice(v)}
        health={health}
      />

      {/* Floating Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl hover:shadow-emerald-600/30 transition-all duration-300 transform hover:-translate-y-0.5 group focus:outline-hidden"
          title="Open PriceSense AI Assistant"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500/80 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight">PriceSense AI</div>
            <div className="text-[10px] text-emerald-100 font-medium">Multilingual Assistant</div>
          </div>
        </button>
      )}

      {/* Chat Drawer / Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ${
            isFullscreen
              ? 'inset-4 md:inset-10 rounded-3xl'
              : 'bottom-6 right-6 w-full sm:w-[420px] h-[600px] max-h-[85vh] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-emerald-600 dark:bg-emerald-700 text-white rounded-t-3xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold leading-none">PriceSense AI Assistant</h3>
                  <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-mono uppercase">
                    {selectedLanguage}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>
                    {currentContext?.market
                      ? `${currentContext.market} • ${currentContext.commodity || 'Crops'}`
                      : 'Multilingual Voice & Forecasting'}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 text-white/80">
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Voice & Language Settings"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Restore' : 'Fullscreen'}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors hidden sm:block"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  stopAudio();
                  setIsOpen(false);
                }}
                title="Close Assistant"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Suggested Quick Questions */}
          <SuggestedQuestions
            language={selectedLanguage}
            onSelect={(q) => handleSendMessage(q)}
          />

          {/* Messages */}
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            onPlaySpeech={playAudio}
            activePlayingAudioUrl={activePlayingAudioUrl}
            onStopSpeech={stopAudio}
          />

          {/* Input Footer */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            language={selectedLanguage}
            enableVoice={enableVoice}
            onToggleVoice={(v) => setEnableVoice(v)}
          />
        </div>
      )}
    </>
  );
};

