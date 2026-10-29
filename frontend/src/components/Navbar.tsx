import React from 'react';
import { Sprout, Cpu, UploadCloud, RefreshCw } from 'lucide-react';
import type { ModelStatus } from '../types';

interface NavbarProps {
  modelStatus: ModelStatus | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUpload: () => void;
  onPreloadModel: () => void;
  isPreloading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  modelStatus,
  activeTab,
  setActiveTab,
  onOpenUpload,
  onPreloadModel,
  isPreloading,
}) => {
  const getStatusBadge = () => {
    if (!modelStatus) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Checking Model...
        </span>
      );
    }

    if (modelStatus.status === 'READY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Chronos-Bolt ({modelStatus.device.toUpperCase()}) Active
        </span>
      );
    }

    if (modelStatus.status === 'LOADING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
          Loading Weights...
        </span>
      );
    }

    return (
      <button
        onClick={onPreloadModel}
        disabled={isPreloading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
      >
        <Cpu className="w-3 h-3 text-emerald-600" />
        {isPreloading ? 'Preloading...' : 'Load Chronos-Bolt'}
      </button>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-forest-800 flex items-center justify-center shadow-sm text-white">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  AI <span className="text-emerald-700">PriceSense</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-100 text-emerald-800 rounded">
                  Pretrained AI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Smarter Agricultural Pricing Through AI
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'forecast', label: 'Price Forecasting' },
              { id: 'explorer', label: 'Market Explorer' },
              { id: 'compare', label: 'Commodity Comparison' },
              { id: 'about', label: 'Model Architecture' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Action Tools & Status Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {getStatusBadge()}

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Mandi CSV</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
