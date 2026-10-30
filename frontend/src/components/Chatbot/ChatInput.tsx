import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  language: string;
  enableVoice: boolean;
  onToggleVoice: (enable: boolean) => void;
}

// BCP 47 Language mapping for Web Speech API
const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
};

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  language,
  enableVoice,
  onToggleVoice,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please speak clearly.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, [language]);

  const toggleRecording = () => {
    setSpeechError(null);
    if (!recognitionRef.current) {
      setSpeechError('Voice recording is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = SPEECH_LANG_MAP[language] || 'en-IN';
        recognitionRef.current.start();
      } catch (e: any) {
        setSpeechError(`Could not start microphone: ${e.message}`);
        setIsRecording(false);
      }
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsRecording(false);
    }
    onSendMessage(trimmed);
    setText('');
    setSpeechError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="ml-2 font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Recording Indicator Ripple */}
      {isRecording && (
        <div className="mb-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 animate-pulse font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
          <span>Listening... speak into your microphone in {language.toUpperCase()}</span>
        </div>
      )}

      <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        {/* Voice Toggle Quick Switch */}
        <button
          type="button"
          onClick={() => onToggleVoice(!enableVoice)}
          title={enableVoice ? 'Voice responses active (ElevenLabs)' : 'Voice responses muted'}
          className={`p-2 rounded-xl transition-colors shrink-0 ${
            enableVoice
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          {enableVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Text Area */}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? 'Listening...'
              : `Ask PriceSense AI in ${language.toUpperCase()} or tap mic...`
          }
          className="flex-1 bg-transparent border-0 resize-none py-2 px-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden max-h-24"
        />

        {/* Speech Recognition Button */}
        <button
          type="button"
          onClick={toggleRecording}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
          className={`p-2 rounded-xl transition-all shrink-0 ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
          <span>Grounded in active Agmarknet Mandi data & Chronos AI</span>
        </span>
        <span>Enter to send</span>
      </div>
    </div>
  );
};
