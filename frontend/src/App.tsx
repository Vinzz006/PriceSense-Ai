import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { FilterControls } from './components/FilterControls';
import { PriceForecastChart } from './components/PriceForecastChart';
import { DataQualityBanner } from './components/DataQualityBanner';
import { DataUploadModal } from './components/DataUploadModal';
import { MarketExplorer } from './components/MarketExplorer';
import { CommodityComparison } from './components/CommodityComparison';
import { AboutPage } from './components/AboutPage';
import { ChatbotWidget } from './components/Chatbot/ChatbotWidget';
import { api } from './services/api';
import type {
  FilterCascading,
  HistoricalSeries,
  ForecastResponse,
  ModelStatus,
  MarketSummary,
  UploadResponse,
} from './types';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('forecast');
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Filters State
  const [filters, setFilters] = useState<FilterCascading>({
    states: [],
    districts_by_state: {},
    markets_by_district: {},
    commodities_by_market: {},
    varieties_by_commodity: {},
    grades_by_commodity: {},
  });

  const [selectedState, setSelectedState] = useState<string>('Uttar Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Kanpur');
  const [selectedMarket, setSelectedMarket] = useState<string>('Kanpur(Grain) APMC');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('Wheat');
  const [selectedVariety, setSelectedVariety] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [horizon, setHorizon] = useState<number>(7);
  const [interpolateMissing, setInterpolateMissing] = useState<boolean>(true);

  // Data State
  const [historical, setHistorical] = useState<HistoricalSeries | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [summaries, setSummaries] = useState<MarketSummary[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState<boolean>(false);
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial environment data
  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const [statusRes, filterRes, summaryRes] = await Promise.all([
        api.getModelStatus().catch(() => null),
        api.getFilters().catch(() => null),
        api.getMarketSummaries().catch(() => []),
      ]);

      if (statusRes) setModelStatus(statusRes);
      if (filterRes) setFilters(filterRes);
      if (summaryRes) setSummaries(summaryRes);
    } catch (err: any) {
      console.error('Bootstrap error:', err);
      setErrorMessage('Could not connect to backend. Please ensure the server is running.');
    }
  };

  const loadHistoricalData = async (
    state: string,
    market: string,
    commodity: string,
    district?: string,
    interp: boolean = interpolateMissing
  ) => {
    if (!state || !market || !commodity) return;
    setIsLoadingHistorical(true);
    setErrorMessage(null);
    try {
      const res = await api.getHistoricalSeries({
        state,
        market,
        commodity,
        district: district || undefined,
        variety: selectedVariety || undefined,
        grade: selectedGrade || undefined,
        interpolateMissing: interp,
      });
      setHistorical(res);
      // Reset active forecast when filter changes
      setForecast(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load historical series');
      setHistorical(null);
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  // Re-fetch historical when dropdown selections change
  useEffect(() => {
    if (selectedState && selectedMarket && selectedCommodity) {
      loadHistoricalData(selectedState, selectedMarket, selectedCommodity, selectedDistrict, interpolateMissing);
    }
  }, [selectedState, selectedDistrict, selectedMarket, selectedCommodity, selectedVariety, selectedGrade, interpolateMissing]);

  const handleGenerateForecast = async () => {
    if (!selectedState || !selectedMarket || !selectedCommodity) {
      setErrorMessage('Please select state, market, and commodity.');
      return;
    }

    setIsLoadingForecast(true);
    setErrorMessage(null);
    try {
      const res = await api.generateForecast({
        state: selectedState,
        market: selectedMarket,
        commodity: selectedCommodity,
        district: selectedDistrict || undefined,
        variety: selectedVariety || undefined,
        grade: selectedGrade || undefined,
        horizon,
        interpolateMissing,
      });
      setForecast(res);
      // Refresh model status to show active
      api.getModelStatus().then((s) => setModelStatus(s)).catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute forecast inference');
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const handleExportCsv = () => {
    if (!selectedState || !selectedMarket || !selectedCommodity) return;
    const url = api.getExportCsvUrl({
      state: selectedState,
      market: selectedMarket,
      commodity: selectedCommodity,
      horizon,
      interpolateMissing,
    });
    window.open(url, '_blank');
  };

  const handlePreloadModel = async () => {
    setIsPreloading(true);
    try {
      await api.preloadModel();
      const status = await api.getModelStatus();
      setModelStatus(status);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to preload Chronos-Bolt model');
    } finally {
      setIsPreloading(false);
    }
  };

  const handleApplyPreset = (preset: {
    state: string;
    district: string;
    market: string;
    commodity: string;
    interpolate: boolean;
  }) => {
    setSelectedState(preset.state);
    setSelectedDistrict(preset.district);
    setSelectedMarket(preset.market);
    setSelectedCommodity(preset.commodity);
    setInterpolateMissing(preset.interpolate);
  };

  const handleUploadSuccess = async (_res: UploadResponse) => {
    const [newFilters, newSummaries] = await Promise.all([
      api.getFilters(),
      api.getMarketSummaries(),
    ]);
    setFilters(newFilters);
    setSummaries(newSummaries);

    if (newFilters.states.length > 0) {
      const st = newFilters.states[0];
      setSelectedState(st);
      const dists = newFilters.districts_by_state[st] || [];
      const dist = dists[0] || '';
      setSelectedDistrict(dist);
      const mkts = newFilters.markets_by_district[dist] || [];
      const mkt = mkts[0] || '';
      setSelectedMarket(mkt);
      const comms = newFilters.commodities_by_market[mkt] || [];
      const comm = comms[0] || '';
      setSelectedCommodity(comm);

      loadHistoricalData(st, mkt, comm, dist, interpolateMissing);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Navbar */}
      <Navbar
        modelStatus={modelStatus}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onPreloadModel={handlePreloadModel}
        isPreloading={isPreloading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Forecast Dashboard */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <MetricCards historical={historical} forecast={forecast} />

            {/* Cascading Filter & Preset Bar */}
            <FilterControls
              filters={filters}
              selectedState={selectedState}
              setSelectedState={setSelectedState}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              selectedMarket={selectedMarket}
              setSelectedMarket={setSelectedMarket}
              selectedCommodity={selectedCommodity}
              setSelectedCommodity={setSelectedCommodity}
              selectedVariety={selectedVariety}
              setSelectedVariety={setSelectedVariety}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              horizon={horizon}
              setHorizon={setHorizon}
              interpolateMissing={interpolateMissing}
              setInterpolateMissing={setInterpolateMissing}
              onGenerateForecast={handleGenerateForecast}
              onExportCsv={handleExportCsv}
              isLoading={isLoadingForecast}
              onApplyPreset={handleApplyPreset}
            />

            {/* Interactive Chart */}
            <PriceForecastChart
              historical={historical}
              forecast={forecast}
              commodityName={selectedCommodity}
              marketName={selectedMarket}
              isLoading={isLoadingHistorical}
            />

            {/* Preprocessing and Regulatory Transparency Banner */}
            <DataQualityBanner historical={historical} forecast={forecast} />
          </div>
        )}

        {/* Tab 2: Market Explorer */}
        {activeTab === 'explorer' && (
          <MarketExplorer
            summaries={summaries}
            onSelectSeries={(st, dist, mkt, comm) => {
              setSelectedState(st);
              setSelectedDistrict(dist);
              setSelectedMarket(mkt);
              setSelectedCommodity(comm);
              setActiveTab('forecast');
            }}
          />
        )}

        {/* Tab 3: Commodity Comparison */}
        {activeTab === 'compare' && <CommodityComparison summaries={summaries} />}

        {/* Tab 4: Model Architecture & Methodology */}
        {activeTab === 'about' && <AboutPage />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700">AI PriceSense</span> • Pretrained Zero-Shot
            Mandi Price Intelligence
          </div>
          <div className="text-slate-400">
            Powered by Amazon Chronos-Bolt Small • Built for Agritech Demonstration
          </div>
        </div>
      </footer>

      {/* CSV Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Multilingual Voice AI Assistant */}
      <ChatbotWidget
        currentContext={{
          state: selectedState,
          market: selectedMarket,
          commodity: selectedCommodity,
        }}
      />
    </div>
  );
};

export default App;
