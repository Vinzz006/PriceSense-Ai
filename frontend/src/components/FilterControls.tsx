import React from 'react';
import {
  Sparkles,
  Download,
  HelpCircle,
  MapPin,
  Store,
  Wheat,
  SlidersHorizontal,
} from 'lucide-react';
import type { FilterCascading } from '../types';

interface FilterControlsProps {
  filters: FilterCascading;
  selectedState: string;
  setSelectedState: (val: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (val: string) => void;
  selectedMarket: string;
  setSelectedMarket: (val: string) => void;
  selectedCommodity: string;
  setSelectedCommodity: (val: string) => void;
  selectedVariety: string;
  setSelectedVariety: (val: string) => void;
  selectedGrade: string;
  setSelectedGrade: (val: string) => void;
  horizon: number;
  setHorizon: (val: number) => void;
  interpolateMissing: boolean;
  setInterpolateMissing: (val: boolean) => void;
  onGenerateForecast: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
  onApplyPreset: (preset: {
    state: string;
    district: string;
    market: string;
    commodity: string;
    interpolate: boolean;
  }) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  selectedMarket,
  setSelectedMarket,
  selectedCommodity,
  setSelectedCommodity,
  selectedVariety,
  setSelectedVariety,
  selectedGrade,
  setSelectedGrade,
  horizon,
  setHorizon,
  interpolateMissing,
  setInterpolateMissing,
  onGenerateForecast,
  onExportCsv,
  isLoading,
  onApplyPreset,
}) => {
  // Cascading options
  const availableDistricts = selectedState ? filters.districts_by_state[selectedState] || [] : [];
  const availableMarkets = selectedDistrict
    ? filters.markets_by_district[selectedDistrict] || []
    : selectedState
    ? Object.entries(filters.markets_by_district)
        .filter(([dist]) => availableDistricts.includes(dist))
        .flatMap(([, mkts]) => mkts)
    : [];

  const availableCommodities = selectedMarket
    ? filters.commodities_by_market[selectedMarket] || []
    : [];

  const availableVarieties = selectedCommodity
    ? filters.varieties_by_commodity[selectedCommodity] || []
    : [];

  const availableGrades = selectedCommodity
    ? filters.grades_by_commodity[selectedCommodity] || []
    : [];

  // Presets
  const presets = [
    {
      label: '🌾 Kanpur Wheat (Colab Demo)',
      state: 'Uttar Pradesh',
      district: 'Kanpur',
      market: 'Kanpur(Grain) APMC',
      commodity: 'Wheat',
      interpolate: true,
    },
    {
      label: '🧅 Lasalgaon Onion',
      state: 'Maharashtra',
      district: 'Nashik',
      market: 'Lasalgaon APMC',
      commodity: 'Onion',
      interpolate: false,
    },
    {
      label: '🌱 Indore Soybean',
      state: 'Madhya Pradesh',
      district: 'Indore',
      market: 'Indore APMC',
      commodity: 'Soybean',
      interpolate: false,
    },
    {
      label: '🌾 Khanna Wheat',
      state: 'Punjab',
      district: 'Ludhiana',
      market: 'Khanna APMC',
      commodity: 'Wheat',
      interpolate: false,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Quick Presets Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          Presets:
        </span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onApplyPreset(p)}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border border-slate-200"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Cascading Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* State */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            State
          </label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict('');
              setSelectedMarket('');
              setSelectedCommodity('');
            }}
            className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          >
            <option value="">Select State</option>
            {filters.states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setSelectedMarket('');
              setSelectedCommodity('');
            }}
            disabled={!selectedState}
            className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select District</option>
            {availableDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* Market (APMC) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            Market (APMC)
          </label>
          <select
            value={selectedMarket}
            onChange={(e) => {
              setSelectedMarket(e.target.value);
              setSelectedCommodity('');
            }}
            disabled={!selectedState}
            className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select APMC Market</option>
            {availableMarkets.map((mkt) => (
              <option key={mkt} value={mkt}>
                {mkt}
              </option>
            ))}
          </select>
        </div>

        {/* Commodity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Wheat className="w-3.5 h-3.5 text-emerald-600" />
            Commodity
          </label>
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            disabled={!selectedMarket}
            className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Select Commodity</option>
            {availableCommodities.map((comm) => (
              <option key={comm} value={comm}>
                {comm}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Filters (Variety & Grade if present) */}
      {(availableVarieties.length > 1 || availableGrades.length > 1) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {availableVarieties.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Variety (Optional)
              </label>
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800"
              >
                <option value="">All Varieties</option>
                {availableVarieties.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableGrades.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Grade (Optional)
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800"
              >
                <option value="">All Grades</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Horizon & Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
        {/* Horizon Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700">Forecast Horizon:</span>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
            {[1, 3, 7, 14].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  horizon === h
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {h} {h === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Missing-Data Interpolation Toggle */}
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={interpolateMissing}
              onChange={(e) => setInterpolateMissing(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
            />
            <span>Interpolate missing dates</span>
          </label>
          <div
            className="group relative"
            title="When enabled, missing calendar dates (e.g. mandi weekend closures) are filled with linear interpolation before feeding into Chronos."
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!selectedMarket || !selectedCommodity}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={onGenerateForecast}
            disabled={!selectedMarket || !selectedCommodity || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? 'Running Inference...' : 'Generate AI Forecast'}
          </button>
        </div>
      </div>
    </div>
  );
};
