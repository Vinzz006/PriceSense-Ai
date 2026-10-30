# AI PriceSense 🌾
### Smarter Agricultural Pricing Through AI

**AI PriceSense** is an AI-powered agricultural commodity price forecasting platform tailored for Indian farmers, APMC mandi traders, agribusinesses, and policy stakeholders. It combines real Agmarknet agricultural spot pricing data with state-of-the-art zero-shot time-series forecasting powered by **Amazon Chronos-Bolt Small**.

---

## 🌟 Key Features

- **Cascading Mandi Navigation:** Filter by Indian State ➔ District ➔ APMC Market ➔ Commodity ➔ Variety / Grade.
- **Pretrained Foundation Model:** Uses frozen `amazon/chronos-bolt-small` (48M parameters) without requiring model training or fine-tuning.
- **Probabilistic Forecasting:** Generates 1, 3, 7, and 14-day forecasts with 10th percentile (lower bound), 50th percentile (median forecast), and 90th percentile (upper bound) uncertainty intervals.
- **Interactive Visualizations:** Powered by Recharts with historical modal price trends, model forecasts, uncertainty envelopes, and distinct boundary markers.
- **Mandi-Aware Data Ingestion:**
  - Robust Agmarknet CSV upload (supports both standard `modal_price` and government `Modal_x0020_Price`, `Arrival_Date`, etc.).
  - Automatic duplicate intra-day transaction aggregation using mean modal price.
  - Transparent calendar continuity analysis: detects market closures on weekends/holidays and offers explicit, documented linear interpolation.
- **Side-by-Side Commodity Comparison:** Compare price movements and spreads across commodities and markets.
- **Market Explorer:** Browse trading volumes, average prices, and ranges across mandis.
- **Export Capabilities:** One-click CSV export of combined historical and forecast trajectories.
- **Multilingual AI Voice Assistant (PriceSense AI):**
  - Conversational intelligence powered by Google Gemini API (`gemini-2.5-flash`).
  - Native support for 11 Indian languages: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, and Urdu.
  - High-fidelity voice synthesis using official ElevenLabs Text-to-Speech (`eleven_flash_v2_5`) with female and male voice profiles.
  - Hands-free speech-to-text input via browser Web Speech API with live transcript preview.
  - Deep grounding: Assistant directly invokes backend tools to fetch latest Agmarknet prices, compare mandis, and run real Chronos-Bolt Small forecasts.
  - Built-in zero-latency local rule-based fallback when external API keys are omitted.

---

## 🏗️ Architecture & Technology Stack

```
AI PriceSense Architecture
┌────────────────────────────────────────────────────────┐
│               React + Vite Frontend (Port 5173/3000)   │
│  - Tailwind CSS + Agritech Palette (Forest & Emerald)  │
│  - Recharts Composed Area/Line Visualizations          │
│  - Cascading Dropdowns & Missing-Data Toggles          │
│  - Metric Cards & Data Quality Advisory Banners        │
└───────────────────────────▲────────────────────────────┘
                            │ REST JSON & CSV
┌───────────────────────────▼────────────────────────────┐
│              FastAPI Backend Service (Port 8000)       │
│  - /api/historical (Intra-day aggregation & gaps)      │
│  - /api/forecast   (Chronos pipeline execution)        │
│  - /api/data/upload (Mandi CSV validator & parser)     │
│  - /api/export/forecast.csv (RFC 4180 export)          │
└───────────────────────────▲────────────────────────────┘
                            │ PyTorch Tensor Context
┌───────────────────────────▼────────────────────────────┐
│      amazon/chronos-bolt-small (Hugging Face)          │
│  - 48M Parameter Pretrained Transformer                │
│  - Zero-shot Patch Autoregressive Architecture         │
│  - CPU & CUDA Inference Support                        │
└────────────────────────────────────────────────────────┘
```

### Technology Breakdown

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Pandas, NumPy, PyTorch.
- **AI Forecasting:** `chronos-forecasting` package using `amazon/chronos-bolt-small`.
- **Packaging:** Docker, Docker Compose, Pytest.

---

## 🤖 The Pretrained Chronos-Bolt Model Constraint

AI PriceSense strictly complies with the pretrained time-series model requirement:

1. **No Training or Retraining:** We do **not** train a custom model, fine-tune weights, or call paid external commercial APIs.
2. **Zero-Shot Generalization:** Chronos-Bolt was pretrained by Amazon Science on tens of billions of time-series observations across diverse domains (retail, finance, energy, weather, and commodity flows). It tokenizes continuous price series into patched representations and projects future trajectories purely from historical context.
3. **Quantile Inference API:**
   ```python
   from chronos import BaseChronosPipeline
   import torch

   pipeline = BaseChronosPipeline.from_pretrained("amazon/chronos-bolt-small", device_map="cpu")
   context = torch.tensor([2440.0, 2445.0, 2450.0, ...], dtype=torch.float32)

   # Quantile levels: 10th percentile, 50th median, 90th percentile
   res = pipeline.predict_quantiles(
       inputs=context,
       prediction_length=7,
       quantile_levels=[0.1, 0.5, 0.9]
   )
   ```
4. **Hardware Acceleration:** Auto-selects CUDA if an NVIDIA GPU is available, otherwise falls back gracefully to CPU inference.

---

## 📁 Repository Structure

```text
PriceSense Ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app & CORS configuration
│   │   ├── core/
│   │   │   └── config.py        # Settings & hardware auto-selection
│   │   ├── api/
│   │   │   ├── schemas.py       # Pydantic schemas
│   │   │   └── endpoints.py     # Health, historical, forecast, upload, export APIs
│   │   ├── services/
│   │   │   ├── data_service.py  # Ingestion, aggregation, gap detection & interpolation
│   │   │   └── forecast_service.py # Singleton Chronos-Bolt pipeline runner
│   │   └── data/
│   │       └── uploads/         # Storage for uploaded custom CSVs
│   ├── tests/
│   │   ├── test_data_service.py     # Aggregation, missing dates, column tests
│   │   ├── test_forecast_service.py # Sequence length & quantile ordering tests
│   │   └── test_api.py              # End-to-end API integration tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Brand, status pills, model preload
│   │   │   ├── MetricCards.tsx        # Latest price, forecast median, change %
│   │   │   ├── FilterControls.tsx     # Cascading dropdowns & quick presets
│   │   │   ├── PriceForecastChart.tsx # Recharts historical & forecast chart
│   │   │   ├── DataQualityBanner.tsx  # Preprocessing & ethical AI disclaimers
│   │   │   ├── DataUploadModal.tsx    # Drag-and-drop CSV uploader & preview
│   │   │   ├── MarketExplorer.tsx     # Multi-mandi browser
│   │   │   ├── CommodityComparison.tsx# Side-by-side comparative trends
│   │   │   └── AboutPage.tsx          # Architecture, model details, methodology
│   │   ├── services/
│   │   │   └── api.ts                 # Typed fetch client
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript data models
│   │   ├── App.tsx                    # Main state coordinator
│   │   ├── index.css                  # Tailwind styles
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
├── data/
│   ├── sample_mandi_prices.csv        # Multi-state default demonstration dataset
│   ├── kanpur_wheat_demo.csv          # Kanpur(Grain) APMC Wheat benchmark
│   └── generate_data.py               # Data generation & synthetic generator script
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── pytest.ini
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites

- **Python:** 3.10+ (tested on Python 3.11 & 3.13)
- **Node.js:** 18+ (tested on Node v20 & v24)
- **Git**

---

### Step 1: Backend Setup

1. Open a terminal and navigate to the project root:
   ```bash
   cd "PriceSense Ai"
   ```

2. (Optional) Create and activate a Python virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Start the FastAPI backend server:
   - **Windows PowerShell:**
     ```powershell
     $env:PYTHONPATH="backend"
     python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
     ```
   - **macOS / Linux:**
     ```bash
     export PYTHONPATH=backend
     python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
     ```

5. Verify the backend is running:
   - Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   - Interactive Swagger API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 2: Frontend Setup

1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd "PriceSense Ai/frontend"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

### Step 3: Running with Docker Compose (Alternative)

If you have Docker and Docker Compose installed:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Hugging Face model weights are stored in the persistent named volume `hf_cache`.

---

## 🧪 Running Automated Tests

All unit and integration tests are managed via `pytest`.

```bash
# From the project root
python -m pytest -v
```

### Test Coverage Highlights
- ✅ `test_health_endpoint`: Verifies API uptime and service metadata.
- ✅ `test_model_status_endpoint`: Verifies device map, supported horizons, and Hugging Face ID.
- ✅ `test_filters_endpoint`: Verifies cascading hierarchy for States ➔ Districts ➔ Mandis ➔ Commodities.
- ✅ `test_historical_endpoint`: Tests multi-row daily aggregation and unit formatting (`₹/quintal`).
- ✅ `test_forecast_endpoint`: Executes real zero-shot inference with Chronos-Bolt Small and verifies output dimensions and quantile ordering (`lower_10 <= median <= upper_90`).
- ✅ `test_csv_upload_endpoint`: Validates CSV parsing, malformed row rejection, and preview generation.
- ✅ `test_csv_export_endpoint`: Generates RFC 4180 CSV with historical and forecast segments.
- ✅ `test_chat_health`: Validates conversational engine and ElevenLabs configuration status.
- ✅ `test_get_languages`: Asserts all 11 Indian languages with native scripts are registered.
- ✅ `test_get_voices`: Checks multilingual female and male voice profiles.
- ✅ `test_agricultural_tools`: Validates latest price lookup, dataset metrics, and market comparison.
- ✅ `test_chat_message_english_price`: Tests English conversational query with price resolution.
- ✅ `test_chat_message_hindi`: Tests Hindi query and native Devanagari conversational response.
- ✅ `test_chat_message_tamil`: Tests Tamil query and native Tamil conversational response.
- ✅ `test_chat_context_retention`: Confirms session retains commodity/mandi context across follow-up queries.
- ✅ `test_duplicate_dates_aggregation`: Asserts daily grouping by mean modal price.
- ✅ `test_missing_dates_detection_and_interpolation`: Verifies gap counting and linear interpolation.

---

## 📊 Preprocessing and Missing-Data Policy

Indian APMC mandis are open auction markets that routinely close on Sundays, gazetted holidays, and during local festivals. Real Agmarknet daily files therefore naturally exhibit non-contiguous calendar series.

1. **Intra-Day Aggregation:** A market may record multiple entries per day for different arrival lots, varieties, or grades. AI PriceSense groups duplicate daily entries and aggregates modal prices via the arithmetic mean:
   $$\text{Daily Modal Price} = \frac{1}{N} \sum_{i=1}^N \text{modal\_price}_i$$
2. **Gap Detection:** The system generates the complete expected calendar date span between $\min(\text{date})$ and $\max(\text{date})$:
   $$\text{Expected Days} = (\text{End Date} - \text{Start Date}) + 1$$
   Any calendar dates absent from the observed records are flagged and counted.
3. **Explicit Interpolation:** By default, AI PriceSense preserves raw historical observations and alerts the user. If the user toggles **"Interpolate missing dates"**, linear calendar interpolation is performed:
   $$P(t) = P(t_0) + \frac{P(t_1) - P(t_0)}{t_1 - t_0}(t - t_0)$$
   Every interpolated point is explicitly tagged with `is_interpolated: true` and rendered with custom tooltips.

---

## ⚠️ Important Advisory & Limitations

1. **Pretrained Zero-Shot Scope:** Chronos-Bolt Small predicts trajectories purely based on sequence context. It does not ingest exogenous features such as rainfall anomalies, export duty policy updates, diesel transportation hikes, or global geopolitical shocks.
2. **Calendar Interpolation Advisory:** Interpolated prices reflect linear approximations between observed trading days and do not represent actual conducted auction trades.
3. **Educational & Decision Support:** Projections are model-derived statistical estimates intended for advisory, academic demonstration, and exploratory analysis. They do not constitute guaranteed future spot returns or financial advice.

---

## 📜 License

Academic & Open Educational Prototype — Built for Agritech Intelligence & Final Year Demonstration.
