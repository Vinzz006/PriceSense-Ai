import React from 'react';
import { TrendingUp, TrendingDown, Calendar, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ForecastResponse, HistoricalSeries } from '../types';

interface MetricCardsProps {
  historical: HistoricalSeries | null;
  forecast: ForecastResponse | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ historical, forecast }) => {
  const latestPrice = forecast
    ? forecast.latest_historical_price
    : historical && historical.data_points.length > 0
    ? historical.data_points[historical.data_points.length - 1].modal_price
    : null;

  const latestDate = forecast
    ? forecast.latest_historical_date
    : historical && historical.data_points.length > 0
    ? historical.data_points[historical.data_points.length - 1].date
    : null;

  const forecastMedian = forecast ? forecast.forecast_median_summary : null;
  const firstForecast = forecast && forecast.forecasts.length > 0 ? forecast.forecasts[0] : null;
  const changePct = forecast ? forecast.forecast_change_pct : null;
  const changeAbs = forecast ? forecast.forecast_change_abs : null;

  const isUp = changePct !== null && changePct >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Latest Available Price */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Latest Observed Price</span>
          <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-slate-100 text-slate-700">
            Actual Agmarknet
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {latestPrice !== null ? `₹${latestPrice.toLocaleString('en-IN')}` : '—'}
          </span>
          <span className="text-xs font-medium text-slate-500">/ quintal</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Recorded on {latestDate || '—'}</span>
        </div>
      </div>

      {/* 2. Forecast Median */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Forecast Median (T+1)</span>
          <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-emerald-100 text-emerald-800">
            Chronos AI
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
            {forecastMedian !== null ? `₹${forecastMedian.toLocaleString('en-IN')}` : '—'}
          </span>
          <span className="text-xs font-medium text-slate-500">/ quintal</span>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {firstForecast ? (
            <span className="text-slate-600 font-medium">
              Model range: ₹{firstForecast.lower_10.toLocaleString('en-IN')} – ₹
              {firstForecast.upper_90.toLocaleString('en-IN')}
            </span>
          ) : (
            <span>Run forecast to view estimate</span>
          )}
        </div>
      </div>

      {/* 3. Forecast Change */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Estimated Change</span>
          <span className="text-[11px] text-slate-400">vs Last Observation</span>
        </div>
        <div className="flex items-baseline gap-2">
          {changePct !== null ? (
            <>
              <span
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-1 ${
                  isUp ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-6 h-6 inline stroke-[2.5]" />
                ) : (
                  <TrendingDown className="w-6 h-6 inline stroke-[2.5]" />
                )}
                {isUp ? '+' : ''}
                {changePct.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500">
                ({isUp ? '+' : ''}₹{changeAbs?.toFixed(2)}/q)
              </span>
            </>
          ) : (
            <span className="text-2xl sm:text-3xl font-bold text-slate-400">—</span>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {changePct !== null
            ? isUp
              ? 'Upward price momentum predicted'
              : 'Softening price trend predicted'
            : 'Awaiting model inference'}
        </div>
      </div>

      {/* 4. Data Coverage */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Data Coverage</span>
          {historical?.has_gaps ? (
            <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-amber-50 text-amber-700 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              {historical.missing_dates_count} Gaps
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] rounded font-medium bg-emerald-50 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Continuous
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {historical ? historical.unique_dates_count : '—'}
          </span>
          <span className="text-xs font-medium text-slate-500">observed days</span>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 truncate">
          <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">
            {historical?.is_interpolated
              ? 'Linear calendar interpolation applied'
              : `${historical?.total_records || 0} raw records in span`}
          </span>
        </div>
      </div>
    </div>
  );
};
