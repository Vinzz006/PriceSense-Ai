export interface HistoricalPoint {
  date: string;
  modal_price: number;
  min_price?: number | null;
  max_price?: number | null;
  is_interpolated: boolean;
}

export interface HistoricalSeries {
  state: string;
  district?: string | null;
  market: string;
  commodity: string;
  variety?: string | null;
  grade?: string | null;
  unit: string;
  data_points: HistoricalPoint[];
  start_date: string;
  end_date: string;
  total_records: number;
  unique_dates_count: number;
  missing_dates_count: number;
  missing_dates: string[];
  has_gaps: boolean;
  is_interpolated: boolean;
  warnings: string[];
}

export interface ForecastPoint {
  date: string;
  median: number;
  lower_10: number;
  upper_90: number;
  mean?: number | null;
}

export interface ForecastResponse {
  state: string;
  district?: string | null;
  market: string;
  commodity: string;
  variety?: string | null;
  grade?: string | null;
  latest_historical_date: string;
  latest_historical_price: number;
  forecast_horizon: number;
  model_id: string;
  generated_at: string;
  unit: string;
  forecast_median_summary: number;
  forecast_change_abs: number;
  forecast_change_pct: number;
  forecasts: ForecastPoint[];
  historical_context: HistoricalPoint[];
  data_quality_warnings: string[];
  has_missing_dates: boolean;
  was_interpolated: boolean;
}

export interface ModelStatus {
  model_id: string;
  status: 'READY' | 'LOADING' | 'ERROR' | 'UNLOADED';
  device: string;
  cuda_available: boolean;
  supported_horizons: number[];
  quantiles: number[];
  loaded_at?: string | null;
  error_message?: string | null;
}

export interface UploadResponse {
  status: string;
  filename: string;
  rows_total: number;
  rows_accepted: number;
  rows_rejected: number;
  unique_dates: number;
  start_date?: string | null;
  end_date?: string | null;
  states_count: number;
  markets_count: number;
  commodities_count: number;
  preview: Array<Record<string, any>>;
  warnings: string[];
}

export interface FilterCascading {
  states: string[];
  districts_by_state: Record<string, string[]>;
  markets_by_district: Record<string, string[]>;
  commodities_by_market: Record<string, string[]>;
  varieties_by_commodity: Record<string, string[]>;
  grades_by_commodity: Record<string, string[]>;
}

export interface MarketSummary {
  state: string;
  district?: string | null;
  market: string;
  commodity: string;
  latest_price: number;
  latest_date: string;
  avg_price: number;
  price_min: number;
  price_max: number;
  record_count: number;
}

export interface ForecastHistoryItem {
  id: string;
  timestamp: string;
  state: string;
  market: string;
  commodity: string;
  horizon: number;
  latest_price: number;
  forecast_median: number;
  change_pct: number;
}
