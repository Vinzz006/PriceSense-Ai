import io
import re
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

import pandas as pd
import numpy as np

from app.core.config import settings
from app.api.schemas import (
    HistoricalPoint,
    HistoricalSeriesResponse,
    UploadResponse,
    FilterCascadingResponse,
    MarketSummaryItem
)

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.dataset_name: str = "default_sample"
        self.last_loaded: Optional[str] = None
        self._load_initial_data()

    def _load_initial_data(self):
        """Loads default sample Mandi dataset or demo Kanpur dataset."""
        try:
            if settings.DATA_PATH.exists():
                self.load_csv_file(settings.DATA_PATH, dataset_name="default_sample")
                logger.info(f"Loaded default dataset from {settings.DATA_PATH} with {len(self.df)} rows")
            elif settings.DEMO_KANPUR_PATH.exists():
                self.load_csv_file(settings.DEMO_KANPUR_PATH, dataset_name="kanpur_wheat_demo")
                logger.info(f"Loaded demo Kanpur dataset from {settings.DEMO_KANPUR_PATH}")
            else:
                logger.warning("No default dataset found. Initializing empty dataset.")
                self.df = pd.DataFrame(columns=[
                    "date", "state", "district", "market", "commodity",
                    "variety", "grade", "min_price", "max_price", "modal_price"
                ])
        except Exception as e:
            logger.error(f"Error loading initial dataset: {e}")
            self.df = pd.DataFrame()

    def normalize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalizes columns from different Mandi / Agmarknet exports."""
        col_map = {}
        for col in df.columns:
            clean = col.strip().lower()
            # Date mappings
            if clean in ["arrival_date", "date", "report_date", "arrivaldate"]:
                col_map[col] = "date"
            # State mappings
            elif clean in ["state", "state_name", "statename"]:
                col_map[col] = "state"
            # District mappings
            elif clean in ["district", "district_name", "districtname"]:
                col_map[col] = "district"
            # Market mappings
            elif clean in ["market", "market_center", "marketcenter", "market_name"]:
                col_map[col] = "market"
            # Commodity mappings
            elif clean in ["commodity", "commodity_name", "commodityname"]:
                col_map[col] = "commodity"
            # Variety mappings
            elif clean in ["variety", "variety_name"]:
                col_map[col] = "variety"
            # Grade mappings
            elif clean in ["grade", "grade_name"]:
                col_map[col] = "grade"
            # Price mappings
            elif clean in ["min_price", "min_x0020_price", "min price", "minimum_price"]:
                col_map[col] = "min_price"
            elif clean in ["max_price", "max_x0020_price", "max price", "maximum_price"]:
                col_map[col] = "max_price"
            elif clean in ["modal_price", "modal_x0020_price", "modal price", "price"]:
                col_map[col] = "modal_price"
                
        df = df.rename(columns=col_map)
        return df

    def parse_and_validate_dataframe(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, int, int, List[str]]:
        """
        Validates, cleans and standardizes the DataFrame.
        Returns: (cleaned_df, total_rows, rejected_rows, warnings)
        """
        total_rows = len(raw_df)
        warnings = []
        
        df = self.normalize_column_names(raw_df)
        
        required = ["date", "state", "market", "commodity", "modal_price"]
        missing_req = [c for c in required if c not in df.columns]
        if missing_req:
            raise ValueError(f"CSV missing mandatory column(s): {', '.join(missing_req)}")
            
        if "district" not in df.columns:
            df["district"] = df["market"]
        else:
            df["district"] = df["district"].fillna(df["market"])

        if "variety" not in df.columns:
            df["variety"] = "General"
        else:
            df["variety"] = df["variety"].fillna("General")

        if "grade" not in df.columns:
            df["grade"] = "FAQ"
        else:
            df["grade"] = df["grade"].fillna("FAQ")

        if "min_price" not in df.columns:
            df["min_price"] = np.nan
        if "max_price" not in df.columns:
            df["max_price"] = np.nan

        # Clean string columns: strip whitespace and sanitize missing indicators
        for col in ["state", "district", "market", "commodity", "variety", "grade"]:
            df[col] = df[col].fillna("").astype(str).str.strip()
            if col == "district":
                bad_mask = df[col].str.lower().isin(["nan", "none", ""])
                df.loc[bad_mask, col] = df.loc[bad_mask, "market"]
            elif col == "variety":
                df[col] = df[col].replace({"nan": "General", "None": "General", "": "General"})
            elif col == "grade":
                df[col] = df[col].replace({"nan": "FAQ", "None": "FAQ", "": "FAQ"})

        # Parse dates safely
        # Handle formats like DD/MM/YYYY, YYYY-MM-DD, etc.
        df["parsed_date"] = pd.to_datetime(df["date"], format="mixed", errors="coerce")
        bad_dates = df["parsed_date"].isna().sum()
        if bad_dates > 0:
            warnings.append(f"{bad_dates} rows had unparseable dates and were removed.")
            df = df.dropna(subset=["parsed_date"])

        # Convert prices to numeric
        for p_col in ["modal_price", "min_price", "max_price"]:
            df[p_col] = pd.to_numeric(df[p_col], errors="coerce")

        # Reject nonpositive or NaN modal prices
        valid_prices_mask = (df["modal_price"].notna()) & (df["modal_price"] > 0)
        invalid_prices_cnt = len(df) - valid_prices_mask.sum()
        if invalid_prices_cnt > 0:
            warnings.append(f"{invalid_prices_cnt} rows had invalid or non-positive modal prices and were removed.")
            df = df[valid_prices_mask]

        df["date"] = df["parsed_date"].dt.strftime("%Y-%m-%d")
        df = df.drop(columns=["parsed_date"])

        rejected_rows = total_rows - len(df)
        return df, total_rows, rejected_rows, warnings

    def load_csv_file(self, file_path_or_buffer, dataset_name: str = "uploaded") -> UploadResponse:
        """Loads and parses a CSV file into the active dataset."""
        try:
            raw_df = pd.read_csv(file_path_or_buffer)
        except Exception as e:
            raise ValueError(f"Could not parse CSV file: {str(e)}")

        cleaned_df, total_rows, rejected_rows, warnings = self.parse_and_validate_dataframe(raw_df)
        
        self.df = cleaned_df
        self.dataset_name = dataset_name
        self.last_loaded = datetime.now(timezone.utc).isoformat()

        unique_dates = self.df["date"].nunique() if not self.df.empty else 0
        min_date = self.df["date"].min() if not self.df.empty else None
        max_date = self.df["date"].max() if not self.df.empty else None

        preview = self.df.head(10).to_dict(orient="records")

        return UploadResponse(
            status="SUCCESS",
            filename=dataset_name,
            rows_total=total_rows,
            rows_accepted=len(self.df),
            rows_rejected=rejected_rows,
            unique_dates=unique_dates,
            start_date=min_date,
            end_date=max_date,
            states_count=self.df["state"].nunique() if not self.df.empty else 0,
            markets_count=self.df["market"].nunique() if not self.df.empty else 0,
            commodities_count=self.df["commodity"].nunique() if not self.df.empty else 0,
            preview=preview,
            warnings=warnings
        )

    def get_filter_hierarchy(self) -> FilterCascadingResponse:
        """Returns structured cascading hierarchy for state -> district -> market -> commodity."""
        if self.df is None or self.df.empty:
            return FilterCascadingResponse(
                states=[],
                districts_by_state={},
                markets_by_district={},
                commodities_by_market={}
            )

        states = sorted(self.df["state"].unique().tolist())
        
        districts_by_state = {}
        for state in states:
            dists = self.df[self.df["state"] == state]["district"].dropna().unique().tolist()
            districts_by_state[state] = sorted(dists)

        markets_by_district = {}
        for dist in self.df["district"].dropna().unique().tolist():
            mkts = self.df[self.df["district"] == dist]["market"].dropna().unique().tolist()
            markets_by_district[dist] = sorted(mkts)

        commodities_by_market = {}
        for mkt in self.df["market"].dropna().unique().tolist():
            comms = self.df[self.df["market"] == mkt]["commodity"].dropna().unique().tolist()
            commodities_by_market[mkt] = sorted(comms)

        varieties_by_comm = {}
        grades_by_comm = {}
        for comm in self.df["commodity"].dropna().unique().tolist():
            comm_sub = self.df[self.df["commodity"] == comm]
            varieties_by_comm[comm] = sorted(comm_sub["variety"].dropna().unique().tolist())
            grades_by_comm[comm] = sorted(comm_sub["grade"].dropna().unique().tolist())

        return FilterCascadingResponse(
            states=states,
            districts_by_state=districts_by_state,
            markets_by_district=markets_by_district,
            commodities_by_market=commodities_by_market,
            varieties_by_commodity=varieties_by_comm,
            grades_by_commodity=grades_by_comm
        )

    def get_historical_series(
        self,
        state: str,
        market: str,
        commodity: str,
        district: Optional[str] = None,
        variety: Optional[str] = None,
        grade: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        interpolate_missing: bool = False
    ) -> HistoricalSeriesResponse:
        """
        Extracts, aggregates duplicate daily entries, detects calendar gaps,
        and optionally interpolates missing daily observations.
        """
        if self.df is None or self.df.empty:
            raise ValueError("No dataset loaded.")

        mask = (
            (self.df["state"].str.lower() == state.strip().lower()) &
            (self.df["market"].str.lower() == market.strip().lower()) &
            (self.df["commodity"].str.lower() == commodity.strip().lower())
        )
        if district:
            mask &= (self.df["district"].str.lower() == district.strip().lower())
        if variety:
            mask &= (self.df["variety"].str.lower() == variety.strip().lower())
        if grade:
            mask &= (self.df["grade"].str.lower() == grade.strip().lower())

        sub_df = self.df[mask].copy()

        if sub_df.empty:
            raise ValueError(f"No records found for {state} -> {market} -> {commodity}")

        # Date range filtering if requested
        sub_df["dt"] = pd.to_datetime(sub_df["date"])
        if start_date:
            sub_df = sub_df[sub_df["dt"] >= pd.to_datetime(start_date)]
        if end_date:
            sub_df = sub_df[sub_df["dt"] <= pd.to_datetime(end_date)]

        if sub_df.empty:
            raise ValueError("No records match the specified date range.")

        raw_count = len(sub_df)

        # Aggregate duplicates on the same date: mean modal price, min of min, max of max
        agg_df = sub_df.groupby("date").agg({
            "modal_price": "mean",
            "min_price": lambda x: x.min() if x.notna().any() else np.nan,
            "max_price": lambda x: x.max() if x.notna().any() else np.nan,
        }).reset_index()

        agg_df["dt"] = pd.to_datetime(agg_df["date"])
        agg_df = agg_df.sort_values("dt").reset_index(drop=True)

        min_dt = agg_df["dt"].min()
        max_dt = agg_df["dt"].max()
        expected_calendar_dates = pd.date_range(min_dt, max_dt, freq="D")
        total_calendar_days = len(expected_calendar_dates)
        observed_dates_set = set(agg_df["dt"].dt.strftime("%Y-%m-%d"))

        missing_dates = [
            d.strftime("%Y-%m-%d") for d in expected_calendar_dates
            if d.strftime("%Y-%m-%d") not in observed_dates_set
        ]
        has_gaps = len(missing_dates) > 0

        warnings = []
        if len(agg_df) < settings.RECOMMENDED_SEQUENCE_LENGTH:
            warnings.append(
                f"Short history: Only {len(agg_df)} distinct days available. "
                f"Chronos performs best with at least {settings.RECOMMENDED_SEQUENCE_LENGTH} daily observations."
            )
        if has_gaps:
            warnings.append(
                f"Dataset contains {len(missing_dates)} missing calendar days out of {total_calendar_days} total span. "
                "Agmarknet markets frequently close on weekends/holidays."
            )

        data_points: List[HistoricalPoint] = []

        if interpolate_missing and has_gaps:
            # Reindex to full calendar and linearly interpolate
            agg_df = agg_df.set_index("dt").reindex(expected_calendar_dates)
            agg_df["date"] = agg_df.index.strftime("%Y-%m-%d")
            # Mark which points were interpolated
            is_interp = agg_df["modal_price"].isna()
            agg_df["modal_price"] = agg_df["modal_price"].interpolate(method="linear").bfill().ffill()
            agg_df["min_price"] = agg_df["min_price"].interpolate(method="linear").bfill().ffill()
            agg_df["max_price"] = agg_df["max_price"].interpolate(method="linear").bfill().ffill()
            agg_df["is_interpolated"] = is_interp
            warnings.append(
                f"Missing observations ({len(missing_dates)} dates) were filled using linear calendar interpolation."
            )
            for _, row in agg_df.iterrows():
                data_points.append(HistoricalPoint(
                    date=row["date"],
                    modal_price=round(float(row["modal_price"]), 2),
                    min_price=round(float(row["min_price"]), 2) if pd.notna(row["min_price"]) else None,
                    max_price=round(float(row["max_price"]), 2) if pd.notna(row["max_price"]) else None,
                    is_interpolated=bool(row["is_interpolated"])
                ))
            was_interpolated = True
        else:
            for _, row in agg_df.iterrows():
                data_points.append(HistoricalPoint(
                    date=row["date"],
                    modal_price=round(float(row["modal_price"]), 2),
                    min_price=round(float(row["min_price"]), 2) if pd.notna(row["min_price"]) else None,
                    max_price=round(float(row["max_price"]), 2) if pd.notna(row["max_price"]) else None,
                    is_interpolated=False
                ))
            was_interpolated = False

        return HistoricalSeriesResponse(
            state=state,
            district=district or (sub_df["district"].iloc[0] if "district" in sub_df.columns else None),
            market=market,
            commodity=commodity,
            variety=variety,
            grade=grade,
            unit="₹/quintal",
            data_points=data_points,
            start_date=min_dt.strftime("%Y-%m-%d"),
            end_date=max_dt.strftime("%Y-%m-%d"),
            total_records=raw_count,
            unique_dates_count=len(observed_dates_set),
            missing_dates_count=len(missing_dates),
            missing_dates=missing_dates,
            has_gaps=has_gaps,
            is_interpolated=was_interpolated,
            warnings=warnings
        )

    def get_market_summaries(self) -> List[MarketSummaryItem]:
        """Provides summary metrics across all active markets and commodities."""
        if self.df is None or self.df.empty:
            return []

        summaries = []
        groups = self.df.groupby(["state", "district", "market", "commodity"])
        for (state, district, market, commodity), group in groups:
            group = group.sort_values("date")
            latest_row = group.iloc[-1]
            summaries.append(MarketSummaryItem(
                state=state,
                district=district,
                market=market,
                commodity=commodity,
                latest_price=round(float(latest_row["modal_price"]), 2),
                latest_date=str(latest_row["date"]),
                avg_price=round(float(group["modal_price"].mean()), 2),
                price_min=round(float(group["modal_price"].min()), 2),
                price_max=round(float(group["modal_price"].max()), 2),
                record_count=len(group)
            ))
        return sorted(summaries, key=lambda x: (x.state, x.market, x.commodity))

data_service = DataService()
