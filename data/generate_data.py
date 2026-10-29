"""
Generate demonstration Mandi datasets for AI PriceSense.
Includes Kanpur(Grain) APMC Wheat series matching the 28-day series from July 2-29, 2026
as detailed in the user requirements, along with multiple other commodities and markets.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def create_demo_data():
    records = []
    
    # 1. Kanpur(Grain) APMC - Wheat (July 2, 2026 to July 29, 2026)
    # 25 unique observed dates out of 28 calendar days
    calendar_dates = pd.date_range("2026-07-02", "2026-07-29", freq="D")
    # 3 missing dates: e.g., 2026-07-05 (Sunday), 2026-07-12 (Sunday), 2026-07-19 (Sunday)
    missing_dates = {pd.Timestamp("2026-07-05"), pd.Timestamp("2026-07-12"), pd.Timestamp("2026-07-19")}
    observed_dates = [d for d in calendar_dates if d not in missing_dates] # 25 dates
    
    np.random.seed(101)
    # Base price trajectory around 2435 to 2465
    base_prices = [
        2440, 2442, 2445, # 2, 3, 4
        2446, 2448, 2450, 2452, 2451, 2453, # 6-11
        2452, 2454, 2455, 2456, 2458, 2460, # 13-18
        2459, 2461, 2462, 2460, 2458, 2457, # 20-25
        2455, 2454, 2453, 2452 # 26-29
    ]
    
    kanpur_wheat_records = []
    # Generate 109 raw records across the 25 dates (roughly 4-5 records per date for different varieties/grades)
    for i, date in enumerate(observed_dates):
        target_modal = base_prices[i]
        varieties = ["Dara", "Deshi", "Kalyan", "Sharbati", "Local"]
        grades = ["FAQ", "Medium", "Grade I"]
        # Generate 4-5 entries per date with minor spreads
        num_entries = 5 if (i % 2 == 0 or i < 9) else 4
        for e in range(num_entries):
            variety = varieties[e % len(varieties)]
            grade = grades[e % len(grades)]
            noise = (e - (num_entries - 1) / 2.0) * 4.0
            modal = round(target_modal + noise, 2)
            min_p = round(modal - np.random.uniform(20, 50), 2)
            max_p = round(modal + np.random.uniform(20, 50), 2)
            row = {
                "date": date.strftime("%Y-%m-%d"),
                "state": "Uttar Pradesh",
                "district": "Kanpur",
                "market": "Kanpur(Grain) APMC",
                "commodity": "Wheat",
                "variety": variety,
                "grade": grade,
                "min_price": min_p,
                "max_price": max_p,
                "modal_price": modal,
            }
            records.append(row)
            kanpur_wheat_records.append(row)

    # 2. Additional commodities for Kanpur (Grain) APMC
    # Rice
    for i, date in enumerate(observed_dates):
        p = round(3200 + 40 * np.sin(i / 3.0) + np.random.normal(0, 8), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Uttar Pradesh",
            "district": "Kanpur",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Rice",
            "variety": "Common",
            "grade": "FAQ",
            "min_price": round(p - 60, 2),
            "max_price": round(p + 80, 2),
            "modal_price": p,
        })
    # Mustard
    for i, date in enumerate(observed_dates):
        p = round(5400 + 75 * np.cos(i / 4.0) + np.random.normal(0, 15), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Uttar Pradesh",
            "district": "Kanpur",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Mustard",
            "variety": "Yellow",
            "grade": "FAQ",
            "min_price": round(p - 100, 2),
            "max_price": round(p + 120, 2),
            "modal_price": p,
        })
    # Potato
    for i, date in enumerate(observed_dates):
        p = round(1450 + 50 * np.sin(i / 2.5) + np.random.normal(0, 12), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Uttar Pradesh",
            "district": "Kanpur",
            "market": "Kanpur(Grain) APMC",
            "commodity": "Potato",
            "variety": "Desi",
            "grade": "FAQ",
            "min_price": round(p - 40, 2),
            "max_price": round(p + 50, 2),
            "modal_price": p,
        })

    # 3. Maharashtra - Lasalgaon APMC (Nashik) - Onion & Tomato
    for i, date in enumerate(observed_dates):
        # Onion (Lasalgaon is Asia's largest onion market)
        p_onion = round(2100 + 120 * np.sin(i / 3.5) + np.random.normal(0, 20), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Maharashtra",
            "district": "Nashik",
            "market": "Lasalgaon APMC",
            "commodity": "Onion",
            "variety": "Red",
            "grade": "FAQ",
            "min_price": round(p_onion - 80, 2),
            "max_price": round(p_onion + 100, 2),
            "modal_price": p_onion,
        })
        # Tomato
        p_tomato = round(2800 + 200 * np.cos(i / 3.0) + np.random.normal(0, 30), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Maharashtra",
            "district": "Nashik",
            "market": "Lasalgaon APMC",
            "commodity": "Tomato",
            "variety": "Hybrid",
            "grade": "FAQ",
            "min_price": round(p_tomato - 120, 2),
            "max_price": round(p_tomato + 150, 2),
            "modal_price": p_tomato,
        })

    # 4. Madhya Pradesh - Indore APMC - Soybean & Wheat
    for i, date in enumerate(observed_dates):
        p_soy = round(4700 + 85 * np.sin(i / 4.0) + np.random.normal(0, 15), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Madhya Pradesh",
            "district": "Indore",
            "market": "Indore APMC",
            "commodity": "Soybean",
            "variety": "Yellow",
            "grade": "FAQ",
            "min_price": round(p_soy - 90, 2),
            "max_price": round(p_soy + 110, 2),
            "modal_price": p_soy,
        })
        p_wh = round(2520 + 30 * np.cos(i / 5.0) + np.random.normal(0, 8), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Madhya Pradesh",
            "district": "Indore",
            "market": "Indore APMC",
            "commodity": "Wheat",
            "variety": "Lokwan",
            "grade": "FAQ",
            "min_price": round(p_wh - 40, 2),
            "max_price": round(p_wh + 60, 2),
            "modal_price": p_wh,
        })

    # 5. Punjab - Khanna APMC (Ludhiana) - Wheat & Paddy
    for i, date in enumerate(observed_dates):
        p_wh = round(2480 + 25 * np.sin(i / 4.0) + np.random.normal(0, 7), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Punjab",
            "district": "Ludhiana",
            "market": "Khanna APMC",
            "commodity": "Wheat",
            "variety": "PBW-502",
            "grade": "FAQ",
            "min_price": round(p_wh - 35, 2),
            "max_price": round(p_wh + 45, 2),
            "modal_price": p_wh,
        })
        p_pad = round(2350 + 40 * np.cos(i / 3.5) + np.random.normal(0, 10), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Punjab",
            "district": "Ludhiana",
            "market": "Khanna APMC",
            "commodity": "Paddy",
            "variety": "PR-126",
            "grade": "FAQ",
            "min_price": round(p_pad - 40, 2),
            "max_price": round(p_pad + 50, 2),
            "modal_price": p_pad,
        })

    # 6. Gujarat - Rajkot APMC - Groundnut & Cotton
    for i, date in enumerate(observed_dates):
        p_gn = round(6150 + 90 * np.sin(i / 3.0) + np.random.normal(0, 20), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Gujarat",
            "district": "Rajkot",
            "market": "Rajkot APMC",
            "commodity": "Groundnut",
            "variety": "Bold",
            "grade": "FAQ",
            "min_price": round(p_gn - 100, 2),
            "max_price": round(p_gn + 130, 2),
            "modal_price": p_gn,
        })
        p_cot = round(7200 + 110 * np.cos(i / 4.5) + np.random.normal(0, 25), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Gujarat",
            "district": "Rajkot",
            "market": "Rajkot APMC",
            "commodity": "Cotton",
            "variety": "Shankar-6",
            "grade": "FAQ",
            "min_price": round(p_cot - 150, 2),
            "max_price": round(p_cot + 170, 2),
            "modal_price": p_cot,
        })

    # 7. Karnataka - Bangalore APMC - Tomato & Ragi
    for i, date in enumerate(observed_dates):
        p_tom = round(2650 + 180 * np.sin(i / 2.8) + np.random.normal(0, 35), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Karnataka",
            "district": "Bangalore Urban",
            "market": "Bangalore APMC",
            "commodity": "Tomato",
            "variety": "Local",
            "grade": "Medium",
            "min_price": round(p_tom - 120, 2),
            "max_price": round(p_tom + 140, 2),
            "modal_price": p_tom,
        })
        p_rag = round(3400 + 35 * np.cos(i / 5.0) + np.random.normal(0, 10), 2)
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "state": "Karnataka",
            "district": "Bangalore Urban",
            "market": "Bangalore APMC",
            "commodity": "Ragi",
            "variety": "Fine",
            "grade": "FAQ",
            "min_price": round(p_rag - 50, 2),
            "max_price": round(p_rag + 60, 2),
            "modal_price": p_rag,
        })

    df_all = pd.DataFrame(records)
    df_kanpur_wheat = pd.DataFrame(kanpur_wheat_records)

    df_all.to_csv("data/sample_mandi_prices.csv", index=False)
    df_kanpur_wheat.to_csv("data/kanpur_wheat_demo.csv", index=False)
    
    print(f"Generated sample_mandi_prices.csv with {len(df_all)} records across {df_all['state'].nunique()} states, {df_all['market'].nunique()} markets, {df_all['commodity'].nunique()} commodities.")
    print(f"Generated kanpur_wheat_demo.csv with {len(df_kanpur_wheat)} records across {df_kanpur_wheat['date'].nunique()} unique dates.")

if __name__ == "__main__":
    create_demo_data()
