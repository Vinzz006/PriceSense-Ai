import React from 'react';
import { Database, Brain, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-forest-950 text-white rounded-2xl p-8 shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Foundation Time-Series AI
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          AI PriceSense: Smarter Agricultural Pricing Through AI
        </h2>
        <p className="mt-3 text-emerald-100 text-sm sm:text-base leading-relaxed max-w-2xl">
          An AI-powered agricultural commodity price forecasting platform built for Indian farmers,
          traders, and market stakeholders. Delivers probabilistic price projections across APMC
          mandis using the pretrained Amazon Chronos-Bolt foundation model.
        </p>
      </div>

      {/* Model Constraint & Architecture */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Brain className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg font-bold text-slate-900">
            Mandatory AI Model: amazon/chronos-bolt-small
          </h3>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          AI PriceSense strictly complies with the pretrained time-series model requirement. Inference
          is executed directly using <strong>Chronos-Bolt Small</strong> developed by Amazon Web
          Services (AWS) Science and hosted on Hugging Face:
        </p>

        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code>
            from chronos import BaseChronosPipeline<br />
            pipeline = BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small", device_map="cpu")<br />
            # Zero-shot quantile forecasting (10th, 50th median, 90th percentile)<br />
            res = pipeline.predict_quantiles(inputs=context_tensor, prediction_length=7, quantile_levels=[0.1, 0.5, 0.9])
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 block uppercase">No Retraining</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">Zero-Shot Foundation AI</span>
            <p className="text-xs text-slate-500 mt-1">
              Weights are unaltered and frozen; model relies on massive pretraining.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 block uppercase">Parameters</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">~48 Million Weights</span>
            <p className="text-xs text-slate-500 mt-1">
              Lightweight T5 encoder-decoder patch architecture designed for fast CPU/GPU inference.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 block uppercase">Uncertainty</span>
            <span className="text-sm font-bold text-slate-800 mt-1 block">Probabilistic Quantiles</span>
            <p className="text-xs text-slate-500 mt-1">
              Computes 10th and 90th percentile bounds alongside the 50th percentile median.
            </p>
          </div>
        </div>
      </div>

      {/* Dataset & Preprocessing Policy */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg font-bold text-slate-900">
            Agricultural Mandi Data Preprocessing & Integrity
          </h3>
        </div>

        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            Agmarknet and mandi datasets frequently feature intra-day variety entries and calendar gaps:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Intra-Day Aggregation:</strong> When multiple lots, varieties, or grades are
                traded on the same date, entries are aggregated using the mean modal price.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Market Isolation:</strong> Prices from distinct markets or commodities are
                strictly never merged into a single time series.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Missing Data Transparency:</strong> Mandis routinely close on Sundays and
                gazetted holidays. The application identifies calendar gaps and requires explicit user
                activation to apply linear interpolation.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Disclaimer Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Prototype Verification & Academic Integrity
        </div>
        <p className="leading-relaxed">
          AI PriceSense is designed for academic presentation, startup prototyping, and agronomic
          research. Historical demonstration results (such as the Kanpur Wheat July 2026 Colab run)
          are benchmarked to verify pipeline alignment. Model predictions reflect statistical pattern
          extrapolation and should be used alongside local mandi checks.
        </p>
      </div>
    </div>
  );
};
