import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { HistoricalSeries, ForecastResponse } from '../types';

interface DataQualityBannerProps {
  historical: HistoricalSeries | null;
  forecast: ForecastResponse | null;
}

export const DataQualityBanner: React.FC<DataQualityBannerProps> = ({ historical, forecast }) => {
  const warnings = [
    ...(historical?.warnings || []),
    ...(forecast?.data_quality_warnings || []),
  ];

  // Remove duplicates
  const uniqueWarnings = Array.from(new Set(warnings));

  return (
    <div className="space-y-3">
      {uniqueWarnings.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-amber-950">Data Preprocessing & Continuity Notices:</span>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                {uniqueWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Advisory and Ethical AI Disclaimer */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800 font-medium">Important Advisory:</strong> Model-derived
          quantiles (10th, 50th, 90th percentiles) are generated zero-shot by the pretrained{' '}
          <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono">
            amazon/chronos-bolt-small
          </code>{' '}
          foundation model. Projections are statistical estimates reflecting historical patterns and
          are intended for advisory and educational purposes, not guaranteed financial returns or spot
          mandi quotes.
        </p>
      </div>
    </div>
  );
};
