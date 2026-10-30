import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Volume2, Square, Play, Sparkles, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onPlaySpeech?: (text: string, existingAudioUrl?: string | null) => void;
  activePlayingAudioUrl?: string | null;
  onStopSpeech?: () => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  onPlaySpeech,
  activePlayingAudioUrl,
  onStopSpeech,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const renderContent = (content: string) => {
    // Basic Markdown Parser for Bold, Lists, Headers
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
            const clean = line.replace(/^[-•*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-emerald-500 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{numMatch[1]}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
              </div>
            );
          }

          // Header
          if (line.startsWith('### ') || line.startsWith('## ')) {
            const h = line.replace(/^#+\s+/, '');
            return (
              <div key={idx} className="font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
            );
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (text: string) => {
    // Replace **bold** with <strong>
    let res = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');
    // Replace *italic* with <em>
    res = res.replace(/\*(.*?)\*/g, '<em class="text-slate-600 dark:text-slate-300">$1</em>');
    // Replace `code` with styled span
    res = res.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-700 dark:text-emerald-400">$1</code>');
    return res;
  };

  return (
    <div ref={scrollRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isPlayingThis = Boolean(
          activePlayingAudioUrl && msg.audio_url && activePlayingAudioUrl.includes(msg.audio_url)
        );

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isUser
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[82%] space-y-2`}>
              <div
                className={`p-3.5 rounded-2xl shadow-xs transition-all ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                }`}
              >
                {/* Content */}
                {renderContent(msg.content)}

                {/* Structured Forecast / Price Highlight Widget */}
                {!isUser && msg.data && msg.data.status === 'success' && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/70 space-y-1.5">
                    {/* Forecast Card */}
                    {msg.data.forecast_median_summary !== undefined && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Chronos-Bolt 7-Day Forecast</span>
                          </span>
                          <span>{msg.data.latest_historical_date}</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{msg.data.forecast_median_summary?.toFixed(2)}/q
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              (msg.data.forecast_change_abs ?? 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {(msg.data.forecast_change_abs ?? 0) >= 0 ? '+' : ''}
                            {msg.data.forecast_change_abs?.toFixed(2)} ({msg.data.forecast_change_pct?.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tool Badges */}
                    {msg.tools_called && msg.tools_called.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.tools_called.map((tool, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                            <span>{tool}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Footer: Voice Audio Button & Timestamp */}
              <div
                className={`flex items-center gap-2 text-[10px] text-slate-400 ${
                  isUser ? 'justify-end pr-1' : 'justify-start pl-1'
                }`}
              >
                <span>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {!isUser && onPlaySpeech && (
                  <>
                    <span>•</span>
                    {isPlayingThis ? (
                      <button
                        onClick={onStopSpeech}
                        className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>Stop Audio</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onPlaySpeech(msg.content, msg.audio_url)}
                        className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{msg.audio_url ? 'Play Voice' : 'Speak'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-800">
            <Bot className="w-4 h-4 animate-pulse" />
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-3 rounded-2xl rounded-tl-xs shadow-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-slate-400 ml-1">Analyzing agricultural data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
