import type {
  FilterCascading,
  HistoricalSeries,
  ForecastResponse,
  ModelStatus,
  UploadResponse,
  MarketSummary,
  ForecastHistoryItem,
  LanguageItem,
  VoiceItem,
  ChatHealth,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = {
  async getHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getModelStatus(): Promise<ModelStatus> {
    const res = await fetch(`${API_BASE_URL}/model/status`);
    if (!res.ok) throw new Error('Failed to fetch model status');
    return res.json();
  },

  async preloadModel(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/model/preload`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to preload model');
    }
    return res.json();
  },

  async getFilters(): Promise<FilterCascading> {
    const res = await fetch(`${API_BASE_URL}/filters`);
    if (!res.ok) throw new Error('Failed to load mandi filters');
    return res.json();
  },

  async getHistoricalSeries(params: {
    state: string;
    market: string;
    commodity: string;
    district?: string;
    variety?: string;
    grade?: string;
    startDate?: string;
    endDate?: string;
    interpolateMissing?: boolean;
  }): Promise<HistoricalSeries> {
    const query = new URLSearchParams({
      state: params.state,
      market: params.market,
      commodity: params.commodity,
      interpolate_missing: String(params.interpolateMissing || false),
    });
    if (params.district) query.append('district', params.district);
    if (params.variety) query.append('variety', params.variety);
    if (params.grade) query.append('grade', params.grade);
    if (params.startDate) query.append('start_date', params.startDate);
    if (params.endDate) query.append('end_date', params.endDate);

    const res = await fetch(`${API_BASE_URL}/historical?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to retrieve historical data');
    }
    return res.json();
  },

  async generateForecast(payload: {
    state: string;
    market: string;
    commodity: string;
    district?: string;
    variety?: string;
    grade?: string;
    horizon: number;
    interpolateMissing: boolean;
    customPrices?: number[];
    customDates?: string[];
  }): Promise<ForecastResponse> {
    const body: Record<string, any> = {
      state: payload.state,
      market: payload.market,
      commodity: payload.commodity,
      horizon: payload.horizon,
      interpolate_missing: payload.interpolateMissing,
    };
    if (payload.district) body.district = payload.district;
    if (payload.variety) body.variety = payload.variety;
    if (payload.grade) body.grade = payload.grade;
    if (payload.customPrices) body.custom_prices = payload.customPrices;
    if (payload.customDates) body.custom_dates = payload.customDates;

    const res = await fetch(`${API_BASE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Forecast inference failed');
    }
    return res.json();
  },

  async uploadCsv(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/data/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'CSV upload failed');
    }
    return res.json();
  },

  async getMarketSummaries(): Promise<MarketSummary[]> {
    const res = await fetch(`${API_BASE_URL}/market-explorer/summary`);
    if (!res.ok) throw new Error('Failed to retrieve market summaries');
    return res.json();
  },

  async getForecastHistory(): Promise<ForecastHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/forecast/history`);
    if (!res.ok) throw new Error('Failed to retrieve forecast history');
    return res.json();
  },

  getExportCsvUrl(params: {
    state: string;
    market: string;
    commodity: string;
    horizon: number;
    interpolateMissing: boolean;
  }): string {
    const query = new URLSearchParams({
      state: params.state,
      market: params.market,
      commodity: params.commodity,
      horizon: String(params.horizon),
      interpolate_missing: String(params.interpolateMissing),
    });
    return `${API_BASE_URL}/export/forecast.csv?${query.toString()}`;
  },

  // Multilingual Voice Chat Assistant Endpoints
  async getChatHealth(): Promise<ChatHealth> {
    const res = await fetch(`${API_BASE_URL}/chat/health`);
    if (!res.ok) throw new Error('Failed to get chat health');
    return res.json();
  },

  async getChatLanguages(): Promise<{ languages: LanguageItem[]; default_language: string }> {
    const res = await fetch(`${API_BASE_URL}/chat/languages`);
    if (!res.ok) throw new Error('Failed to fetch supported languages');
    return res.json();
  },

  async getChatVoices(): Promise<{ voices: VoiceItem[] }> {
    const res = await fetch(`${API_BASE_URL}/chat/voices`);
    if (!res.ok) throw new Error('Failed to fetch available voices');
    return res.json();
  },

  async sendChatMessage(payload: {
    message: string;
    session_id?: string;
    language?: string;
    voice_gender?: string;
    enable_voice?: boolean;
    context?: Record<string, any>;
  }): Promise<{
    response: string;
    session_id: string;
    language: string;
    detected_language?: string;
    audio_url?: string | null;
    data?: Record<string, any> | null;
    tools_called: string[];
  }> {
    const res = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Chat request failed');
    }
    return res.json();
  },

  async generateSpeech(payload: {
    text: string;
    language?: string;
    voice_gender?: string;
    voice_id?: string;
  }): Promise<{ audio_url: string; voice_id: string; language: string }> {
    const res = await fetch(`${API_BASE_URL}/chat/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Voice synthesis failed');
    }
    return res.json();
  },

  async previewVoice(payload: {
    voice_id?: string;
    language?: string;
    gender?: string;
    text?: string;
  }): Promise<{ audio_url?: string; error?: string; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/chat/voice-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Voice preview failed');
    }
    return res.json();
  },
};
