import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Layers, Info, RefreshCw } from 'lucide-react';
import type { HistoricalSeries, ForecastResponse } from '../types';

interface PriceForecastChartProps {
  historical: HistoricalSeries | null;
  forecast: ForecastResponse | null;
  commodityName: string;
  marketName: string;
  isLoading?: boolean;
}

export const PriceForecastChart: React.FC<PriceForecastChartProps> = ({
  historical,
  forecast,
  commodityName,
  marketName,
  isLoading,
}) => {
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Retrieving Market Series...</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Aggregating daily records and computing time-series continuity.
        </p>
      </div>
    );
  }

  if (!historical && !forecast) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[400px]">
        <Layers className="w-12 h-12 text-slate-300 mb-3" />
        <h3 className="text-base font-semibold text-slate-700">No Commodity Series Selected</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Select a state, market, and commodity above to visualize historical price trends and
          generate AI forecasts.
        </p>
      </div>
    );
  }

  // Combine historical and forecast data points
  const combinedData: Array<{
    date: string;
    historicalPrice?: number | null;
    historicalMin?: number | null;
    historicalMax?: number | null;
    isInterpolated?: boolean;
    forecastMedian?: number | null;
    forecastLower?: number | null;
    forecastUpper?: number | null;
    forecastRange?: [number, number] | null;
    type: 'historical' | 'forecast' | 'boundary';
  }> = [];

  const boundaryDate = historical?.end_date || (forecast?.latest_historical_date ?? '');

  if (historical) {
    historical.data_points.forEach((pt) => {
      combinedData.push({
        date: pt.date,
        historicalPrice: pt.modal_price,
        historicalMin: pt.min_price,
        historicalMax: pt.max_price,
        isInterpolated: pt.is_interpolated,
        type: 'historical',
      });
    });
  }

  if (forecast && forecast.forecasts.length > 0) {
    // If we have a boundary point, connect the forecast line seamlessly from the last historical point
    if (historical && historical.data_points.length > 0) {
      const lastHist = historical.data_points[historical.data_points.length - 1];
      // Attach start of forecast line to last point
      const lastEntry = combinedData[combinedData.length - 1];
      if (lastEntry) {
        lastEntry.forecastMedian = lastHist.modal_price;
        lastEntry.forecastLower = lastHist.modal_price;
        lastEntry.forecastUpper = lastHist.modal_price;
        lastEntry.forecastRange = [lastHist.modal_price, lastHist.modal_price];
      }
    }

    forecast.forecasts.forEach((fp) => {
      combinedData.push({
        date: fp.date,
        forecastMedian: fp.median,
        forecastLower: fp.lower_10,
        forecastUpper: fp.upper_90,
        forecastRange: [fp.lower_10, fp.upper_90],
        type: 'forecast',
      });
    });
  }

  // Compute Y-axis bounds dynamically with padding
  const allValues: number[] = [];
  combinedData.forEach((d) => {
    if (d.historicalPrice != null) allValues.push(d.historicalPrice);
    if (d.forecastMedian != null) allValues.push(d.forecastMedian);
    if (d.forecastLower != null) allValues.push(d.forecastLower);
    if (d.forecastUpper != null) allValues.push(d.forecastUpper);
  });

  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 3000;
  const padding = (maxVal - minVal) * 0.12 || 100;
  const yDomain = [Math.floor((minVal - padding) / 10) * 10, Math.ceil((maxVal + padding) / 10) * 10];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    const isForecast = data?.type === 'forecast';

    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-lg shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-sm max-w-xs">
        <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between">
          <span>Date: {label}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
              isForecast ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {isForecast ? 'Chronos Forecast' : data?.isInterpolated ? 'Interpolated' : 'Observed'}
          </span>
        </div>

        {data?.historicalPrice != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Modal Price:</span>
            <span className="font-semibold text-emerald-400">
              ₹{data.historicalPrice.toLocaleString('en-IN')} / quintal
            </span>
          </div>
        )}

        {data?.forecastMedian != null && isForecast && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Median Forecast:</span>
            <span className="font-semibold text-emerald-400">
              ₹{data.forecastMedian.toLocaleString('en-IN')} / quintal
            </span>
          </div>
        )}

        {data?.forecastLower != null && data?.forecastUpper != null && isForecast && (
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">10th – 90th Range:</span>
            <span className="text-slate-300">
              ₹{data.forecastLower.toLocaleString('en-IN')} – ₹
              {data.forecastUpper.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {data?.isInterpolated && (
          <div className="text-[10px] text-amber-400 pt-1">
            * Missing calendar observation filled by linear interpolation.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {commodityName || 'Commodity'} Price Trajectory
          </h3>
          <p className="text-xs text-slate-500">
            {marketName} • Modal Prices (₹/quintal) with 7-Day Chronos AI Projections
          </p>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
            <input
              type="checkbox"
              checked={showUncertainty}
              onChange={(e) => setShowUncertainty(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>Uncertainty Band (10-90%)</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>Grid</span>
          </label>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              dy={10}
              tickFormatter={(d) => {
                const parts = d.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
              }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              domain={yDomain}
              tickFormatter={(v) => `₹${v}`}
              dx={-5}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              iconSize={10}
            />

            {/* Boundary reference line between historical observations and forecast */}
            {boundaryDate && (
              <ReferenceLine
                x={boundaryDate}
                stroke="#047857"
                strokeDasharray="4 4"
                label={{
                  value: 'Forecast Start',
                  position: 'insideTopLeft',
                  fill: '#047857',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* 10th-90th Percentile Uncertainty Band */}
            {showUncertainty && (
              <Area
                type="monotone"
                dataKey="forecastRange"
                stroke="transparent"
                fill="#10b981"
                fillOpacity={0.18}
                name="Forecast Range (10th–90th)"
                legendType="rect"
              />
            )}

            {/* Historical Modal Price Line */}
            <Line
              type="monotone"
              dataKey="historicalPrice"
              stroke="#059669"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#059669', strokeWidth: 1, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#059669' }}
              name="Historical Modal Price"
              connectNulls={false}
            />

            {/* Forecast Median Line */}
            <Line
              type="monotone"
              dataKey="forecastMedian"
              stroke="#064e3b"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#064e3b', strokeWidth: 1.5, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#064e3b' }}
              name="Forecast Median"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Solid line depicts observed Agmarknet mandi prices. Dashed line and shaded band represent
            Chronos-Bolt model forecasts with 80% coverage interval.
          </span>
        </div>
        <span className="text-slate-400 shrink-0">Model: amazon/chronos-bolt-small</span>
      </div>
    </div>
  );
};
