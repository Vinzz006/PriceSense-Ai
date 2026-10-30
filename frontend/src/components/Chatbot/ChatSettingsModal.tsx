import React, { useState } from 'react';
import { X, Volume2, Play, Square, Check, Info } from 'lucide-react';
import type { LanguageItem, VoiceItem, ChatHealth } from '../../types';
import { api } from '../../services/api';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  languages: LanguageItem[];
  selectedLanguage: string;
  onSelectLanguage: (code: string) => void;
  voiceGender: 'female' | 'male';
  onSelectVoiceGender: (gender: 'female' | 'male') => void;
  enableVoice: boolean;
  onToggleVoice: (enable: boolean) => void;
  health: ChatHealth | null;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  languages,
  selectedLanguage,
  onSelectLanguage,
  voiceGender,
  onSelectVoiceGender,
  enableVoice,
  onToggleVoice,
  health,
}) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handlePreviewVoice = async () => {
    try {
      if (audioElement) {
        audioElement.pause();
        setIsPlayingAudio(false);
      }
      setIsPreviewLoading(true);
      setPreviewError(null);

      const res = await api.previewVoice({
        language: selectedLanguage,
        gender: voiceGender,
      });

      if (res.audio_url) {
        const fullAudioUrl = res.audio_url.startsWith('http')
          ? res.audio_url
          : `http://localhost:8000${res.audio_url}`;
        const audio = new Audio(fullAudioUrl);
        setAudioElement(audio);
        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          setPreviewError('Failed to play synthesized audio.');
        };
        await audio.play();
      } else if (res.message) {
        setPreviewError(res.message);
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Voice preview failed.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleStopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            <h3 className="font-semibold text-base">Assistant Voice & Language</h3>
          </div>
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-emerald-700 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800 dark:text-slate-100">
          {/* Language Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Conversation Language (11 Languages)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {languages.map((l) => {
                const isSelected = selectedLanguage === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => onSelectLanguage(l.code)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{l.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{l.native}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Gender Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Voice Output Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onSelectVoiceGender('female')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  voiceGender === 'female'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60'
                }`}
              >
                Female Voice (Rachel)
              </button>
              <button
                onClick={() => onSelectVoiceGender('male')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                  voiceGender === 'male'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60'
                }`}
              >
                Male Voice (Adam)
              </button>
            </div>
          </div>

          {/* Automatic Audio Playback Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                ElevenLabs Voice Responses
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Synthesize spoken audio for assistant answers
              </div>
            </div>
            <button
              onClick={() => onToggleVoice(!enableVoice)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                enableVoice ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  enableVoice ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Voice Preview Tester */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Preview Synthesized Speech
              </span>
              {isPlayingAudio ? (
                <button
                  onClick={handleStopAudio}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-lg hover:bg-red-200"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  disabled={isPreviewLoading}
                  onClick={handlePreviewVoice}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isPreviewLoading ? 'Synthesizing...' : 'Play Sample'}</span>
                </button>
              )}
            </div>
            {previewError && (
              <div className="text-[11px] p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                {previewError}
              </div>
            )}
          </div>

          {/* System Diagnostic Status */}
          {health && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>Backend AI Engine Status</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Gemini API:</span>
                <span className={health.gemini_configured ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                  {health.gemini_configured ? `Active (${health.gemini_model})` : 'Grounded Agricultural Engine (Default)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ElevenLabs TTS:</span>
                <span className={health.elevenlabs_configured ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                  {health.elevenlabs_configured ? `Active (${health.elevenlabs_model})` : 'Key Not Configured (Text-Only)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
