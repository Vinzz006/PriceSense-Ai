import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

from app.services.data_service import data_service
from app.services.forecast_service import forecast_service

logger = logging.getLogger(__name__)

class AgriculturalToolService:
    """
    Implements grounded agricultural queries directly backed by
    the active Mandi dataset and the pretrained Chronos-Bolt Small forecasting pipeline.
    """

    def _resolve_canonical_names(
        self,
        state: Optional[str] = None,
        market: Optional[str] = None,
        commodity: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """Resolves fuzzy/partial names to exact dataset entries."""
        df = data_service.df
        if df is None or df.empty:
            return state or "Uttar Pradesh", market or "Kanpur(Grain) APMC", commodity or "Wheat"

        # Resolve Commodity
        c_val = commodity or "Wheat"
        matching_comms = df[df["commodity"].str.lower().str.contains(c_val.lower().strip(), na=False, regex=False)]
        if not matching_comms.empty:
            c_val = matching_comms["commodity"].iloc[0]
        else:
            c_val = df["commodity"].iloc[0]

        # Filter by resolved commodity
        df_c = df[df["commodity"].str.lower() == c_val.lower()]

        # Resolve State
        s_val = state
        if s_val:
            matching_states = df_c[df_c["state"].str.lower().str.contains(s_val.lower().strip(), na=False, regex=False)]
            if not matching_states.empty:
                s_val = matching_states["state"].iloc[0]
            else:
                s_val = df_c["state"].iloc[0] if not df_c.empty else df["state"].iloc[0]
        else:
            s_val = df_c["state"].iloc[0] if not df_c.empty else df["state"].iloc[0]

        # Filter by resolved state
        df_cs = df_c[df_c["state"].str.lower() == s_val.lower()]

        # Resolve Market
        m_val = market
        if m_val:
            matching_mkts = df_cs[df_cs["market"].str.lower().str.contains(m_val.lower().strip(), na=False, regex=False)]
            if not matching_mkts.empty:
                m_val = matching_mkts["market"].iloc[0]
            else:
                m_val = df_cs["market"].iloc[0] if not df_cs.empty else df["market"].iloc[0]
        else:
            m_val = df_cs["market"].iloc[0] if not df_cs.empty else df["market"].iloc[0]

        return s_val, m_val, c_val

    def get_latest_market_price(
        self,
        commodity: str,
        market: Optional[str] = None,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetches the latest recorded modal, min, and max price for a commodity in a given market/state."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        df = data_service.df.copy()
        
        # Filter commodity case-insensitively
        comm_clean = commodity.strip().lower()
        df = df[df["commodity"].str.lower().str.contains(comm_clean, na=False, regex=False)]
        if df.empty:
            return {
                "status": "not_found",
                "message": f"Commodity '{commodity}' was not found in the loaded dataset.",
                "available_commodities": sorted(data_service.df["commodity"].dropna().unique().tolist())[:10]
            }

        if state:
            state_clean = state.strip().lower()
            df_state = df[df["state"].str.lower().str.contains(state_clean, na=False, regex=False)]
            if not df_state.empty:
                df = df_state

        if market:
            market_clean = market.strip().lower()
            df_mkt = df[df["market"].str.lower().str.contains(market_clean, na=False, regex=False)]
            if not df_mkt.empty:
                df = df_mkt

        df["parsed_date"] = df["date"].astype(str)
        df_sorted = df.sort_values(by="parsed_date", ascending=False)
        latest_row = df_sorted.iloc[0]

        return {
            "status": "success",
            "commodity": str(latest_row["commodity"]),
            "market": str(latest_row["market"]),
            "district": str(latest_row.get("district", "N/A")),
            "state": str(latest_row["state"]),
            "date": str(latest_row["date"]),
            "modal_price": float(latest_row["modal_price"]),
            "min_price": float(latest_row["min_price"]) if "min_price" in latest_row and not pd_isna(latest_row["min_price"]) else None,
            "max_price": float(latest_row["max_price"]) if "max_price" in latest_row and not pd_isna(latest_row["max_price"]) else None,
            "unit": "₹/quintal",
            "data_records_available": len(df_sorted)
        }

    def get_historical_prices(
        self,
        commodity: str,
        market: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 15
    ) -> Dict[str, Any]:
        """Retrieves historical price records for a commodity in a given market/state."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        try:
            st, mkt, comm = self._resolve_canonical_names(state=state, market=market, commodity=commodity)
            
            # Find best match
            series_resp = data_service.get_historical_series(
                state=st,
                market=mkt,
                commodity=comm,
                interpolate_missing=False
            )
            
            points = [
                {"date": p.date, "modal_price": p.modal_price}
                for p in series_resp.data_points[-limit:]
            ]
            
            return {
                "status": "success",
                "commodity": series_resp.commodity,
                "market": series_resp.market,
                "state": series_resp.state,
                "start_date": series_resp.start_date,
                "end_date": series_resp.end_date,
                "unit": series_resp.unit,
                "total_records": series_resp.total_records,
                "recent_points": points
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_price_forecast(
        self,
        commodity: str,
        market: Optional[str] = None,
        state: Optional[str] = None,
        horizon: int = 7
    ) -> Dict[str, Any]:
        """
        Executes real zero-shot forecast using pretrained Chronos-Bolt Small model
        for the requested commodity and market.
        """
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        try:
            # Resolve canonical names from active dataset
            st, mkt, comm = self._resolve_canonical_names(state=state, market=market, commodity=commodity)

            # Fetch series with linear interpolation if missing dates
            series_resp = data_service.get_historical_series(
                state=st,
                market=mkt,
                commodity=comm,
                interpolate_missing=True
            )

            prices = [p.modal_price for p in series_resp.data_points]
            last_date_str = series_resp.end_date

            # Call existing Chronos forecast service directly!
            forecast_resp = forecast_service.forecast_series(
                prices=prices,
                last_date_str=last_date_str,
                horizon=horizon,
                state=series_resp.state,
                district=series_resp.district,
                market=series_resp.market,
                commodity=series_resp.commodity,
                historical_context=series_resp.data_points,
                has_missing_dates=series_resp.has_gaps,
                was_interpolated=series_resp.is_interpolated,
                input_warnings=series_resp.warnings
            )

            # Summarize forecast output
            forecast_items = [
                {
                    "date": f.date,
                    "median": round(f.median, 2),
                    "lower_10": round(f.lower_10, 2),
                    "upper_90": round(f.upper_90, 2)
                }
                for f in forecast_resp.forecasts
            ]

            return {
                "status": "success",
                "commodity": forecast_resp.commodity,
                "market": forecast_resp.market,
                "state": forecast_resp.state,
                "horizon": forecast_resp.forecast_horizon,
                "latest_historical_date": forecast_resp.latest_historical_date,
                "latest_historical_price": forecast_resp.latest_historical_price,
                "forecast_median_summary": forecast_resp.forecast_median_summary,
                "forecast_change_abs": forecast_resp.forecast_change_abs,
                "forecast_change_pct": forecast_resp.forecast_change_pct,
                "model_id": forecast_resp.model_id,
                "unit": forecast_resp.unit,
                "forecasts": forecast_items,
                "warnings": forecast_resp.data_quality_warnings
            }
        except Exception as e:
            logger.error(f"Error in tool get_price_forecast: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def compare_market_prices(
        self,
        commodity: str,
        markets: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Compares prices of a commodity across multiple markets."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        df = data_service.df.copy()
        comm_clean = commodity.strip().lower()
        df = df[df["commodity"].str.lower().str.contains(comm_clean, na=False, regex=False)]
        if df.empty:
            return {"status": "not_found", "message": f"No data found for commodity '{commodity}'."}

        if markets:
            mkt_lowers = [m.lower().strip() for m in markets]
            df = df[df["market"].str.lower().isin(mkt_lowers)]

        # Group by market and get latest price
        df["parsed_date"] = df["date"].astype(str)
        latest_idx = df.groupby("market")["parsed_date"].idxmax()
        latest_rows = df.loc[latest_idx]

        results = []
        for _, row in latest_rows.iterrows():
            results.append({
                "market": str(row["market"]),
                "state": str(row["state"]),
                "latest_date": str(row["date"]),
                "modal_price": float(row["modal_price"]),
                "unit": "₹/quintal"
            })

        results.sort(key=lambda x: x["modal_price"], reverse=True)
        return {
            "status": "success",
            "commodity": commodity,
            "markets_compared": len(results),
            "data": results
        }

    def get_available_markets(self, state: Optional[str] = None, district: Optional[str] = None) -> Dict[str, Any]:
        """Lists available agricultural markets, optionally filtered by state or district."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        df = data_service.df
        if state:
            df = df[df["state"].str.lower().str.contains(state.lower().strip(), na=False, regex=False)]
        if district:
            df = df[df["district"].str.lower().str.contains(district.lower().strip(), na=False, regex=False)]

        markets = sorted(df["market"].dropna().unique().tolist())
        return {
            "status": "success",
            "state_filter": state,
            "district_filter": district,
            "count": len(markets),
            "markets": markets[:30]
        }

    def get_available_commodities(self, market: Optional[str] = None) -> Dict[str, Any]:
        """Lists available commodities, optionally filtered by market."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "error", "message": "No agricultural dataset is loaded."}

        df = data_service.df
        if market:
            df = df[df["market"].str.lower().str.contains(market.lower().strip(), na=False, regex=False)]

        commodities = sorted(df["commodity"].dropna().unique().tolist())
        return {
            "status": "success",
            "market_filter": market,
            "count": len(commodities),
            "commodities": commodities[:30]
        }

    def get_dataset_information(self) -> Dict[str, Any]:
        """Returns metadata regarding the loaded Agmarknet Mandi dataset."""
        if data_service.df is None or data_service.df.empty:
            return {"status": "empty", "message": "No dataset currently loaded."}

        df = data_service.df
        return {
            "status": "success",
            "dataset_name": data_service.dataset_name,
            "total_records": len(df),
            "unique_dates": int(df["date"].nunique()) if "date" in df else 0,
            "date_range": {
                "start": str(df["date"].min()) if "date" in df else "N/A",
                "end": str(df["date"].max()) if "date" in df else "N/A"
            },
            "states_count": int(df["state"].nunique()) if "state" in df else 0,
            "markets_count": int(df["market"].nunique()) if "market" in df else 0,
            "commodities_count": int(df["commodity"].nunique()) if "commodity" in df else 0,
            "top_commodities": df["commodity"].value_counts().head(5).to_dict() if "commodity" in df else {}
        }

def pd_isna(val):
    import pandas as pd
    return pd.isna(val)

agricultural_tool_service = AgriculturalToolService()
