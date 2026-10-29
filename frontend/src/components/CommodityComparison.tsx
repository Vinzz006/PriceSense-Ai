import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Scale, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { MarketSummary, HistoricalSeries } from '../types';

interface CommodityComparisonProps {
  summaries: MarketSummary[];
}

export const CommodityComparison: React.FC<CommodityComparisonProps> = ({ summaries }) => {
  const [selectedA, setSelectedA] = useState<number>(0);
  const [selectedB, setSelectedB] = useState<number>(summaries.length > 1 ? 1 : 0);
  const [seriesA, setSeriesA] = useState<HistoricalSeries | null>(null);
  const [seriesB, setSeriesB] = useState<HistoricalSeries | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (summaries.length > 1 && selectedA === selectedB) {
      setSelectedB(1);
    }
  }, [summaries]);

  useEffect(() => {
    if (summaries.length >= 2) {
      loadComparison();
    }
  }, [selectedA, selectedB, summaries]);

  const loadComparison = async () => {
    const itemA = summaries[selectedA] || summaries[0];
    const itemB = summaries[selectedB] || (summaries.length > 1 ? summaries[1] : summaries[0]);
    if (!itemA || !itemB) return;

    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        api.getHistoricalSeries({
          state: itemA.state,
          market: itemA.market,
          commodity: itemA.commodity,
          interpolateMissing: true,
        }),
        api.getHistoricalSeries({
          state: itemB.state,
          market: itemB.market,
          commodity: itemB.commodity,
          interpolateMissing: true,
        }),
      ]);
      setSeriesA(resA);
      setSeriesB(resB);
    } catch (e) {
      console.error('Failed to load comparison series:', e);
    } finally {
      setLoading(false);
    }
  };

  // Merge data by date
  const dateMap = new Map<string, { date: string; priceA?: number; priceB?: number }>();
  seriesA?.data_points.forEach((pt) => {
    dateMap.set(pt.date, { date: pt.date, priceA: pt.modal_price });
  });
  seriesB?.data_points.forEach((pt) => {
    const existing = dateMap.get(pt.date) || { date: pt.date };
    existing.priceB = pt.modal_price;
    dateMap.set(pt.date, existing);
  });

  const chartData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const itemA = summaries[selectedA];
  const itemB = summaries[selectedB];

  return (
    <div className="space-y-5">
      {/* Selector Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
          <Scale className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Side-by-Side Commodity Comparison</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Series A */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
            <label className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase">
              Series A (Emerald Line)
            </label>
            <select
              value={selectedA}
              onChange={(e) => setSelectedA(Number(e.target.value))}
              className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
            >
              {summaries.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.state} • {s.market} — {s.commodity} (Latest: ₹{s.latest_price})
                </option>
              ))}
            </select>
          </div>

          {/* Series B */}
          <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg">
            <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase">
              Series B (Amber Line)
            </label>
            <select
              value={selectedB}
              onChange={(e) => setSelectedB(Number(e.target.value))}
              className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
            >
              {summaries.map((s, idx) => (
                <option key={idx} value={idx}>
                  {s.state} • {s.market} — {s.commodity} (Latest: ₹{s.latest_price})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Historical Price Movement & Spread</h4>
            <p className="text-xs text-slate-500">
              Modal prices compared across identical calendar observation periods
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading series...
            </div>
          )}
        </div>

        <div className="h-[380px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
                domain={['auto', 'auto']}
                tickFormatter={(v) => `₹${v}`}
                dx={-5}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg text-xs space-y-1 shadow-lg">
                      <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1">
                        Date: {label}
                      </div>
                      {payload.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span style={{ color: p.color }}>{p.name}:</span>
                          <span className="font-mono font-bold">₹{p.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px' }} />
              <Line
                type="monotone"
                dataKey="priceA"
                name={`${itemA?.commodity || 'Series A'} (${itemA?.market})`}
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="priceB"
                name={`${itemB?.commodity || 'Series B'} (${itemB?.market})`}
                stroke="#d97706"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
