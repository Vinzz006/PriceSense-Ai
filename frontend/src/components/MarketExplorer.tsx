import React, { useState } from 'react';
import { Search, Store, ArrowRight } from 'lucide-react';
import type { MarketSummary } from '../types';

interface MarketExplorerProps {
  summaries: MarketSummary[];
  onSelectSeries: (state: string, district: string, market: string, commodity: string) => void;
}

export const MarketExplorer: React.FC<MarketExplorerProps> = ({ summaries, onSelectSeries }) => {
  const [search, setSearch] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');

  const states = Array.from(new Set(summaries.map((s) => s.state))).sort();

  const filtered = summaries.filter((item) => {
    const matchesSearch =
      item.commodity.toLowerCase().includes(search.toLowerCase()) ||
      item.market.toLowerCase().includes(search.toLowerCase()) ||
      item.state.toLowerCase().includes(search.toLowerCase());
    const matchesState = !selectedStateFilter || item.state === selectedStateFilter;
    return matchesSearch && matchesState;
  });

  return (
    <div className="space-y-5">
      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search market, commodity, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter State:</span>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          >
            <option value="">All States</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Mandi Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {item.state}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">{item.commodity}</h4>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900">
                    ₹{item.latest_price.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500">₹/quintal</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-800">{item.market}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block">Avg Price</span>
                  <span className="font-semibold text-slate-800">₹{item.avg_price}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Min – Max</span>
                  <span className="font-semibold text-slate-800">
                    ₹{item.price_min} – {item.price_max}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Data Points</span>
                  <span className="font-semibold text-slate-800">{item.record_count}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Observed {item.latest_date}</span>
              <button
                onClick={() =>
                  onSelectSeries(item.state, item.district || '', item.market, item.commodity)
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 group"
              >
                <span>Forecast Series</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No markets or commodities matched your filter. Try adjusting your search query.
          </div>
        )}
      </div>
    </div>
  );
};
