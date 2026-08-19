"""
Hitwicket Review Intelligence Dashboard
Interactive Streamlit frontend with real working pipeline controls, live execution streaming,
priority score breakdowns, competitor benchmark matrix, founder brief, and review explorer.

Run with:
    streamlit run dashboard.py
"""

import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path
import pandas as pd
import streamlit as st

# Setup paths
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import GAMES, DB_PATH, OUTPUTS_DIR, CATEGORIES, REVIEW_WINDOW_DAYS
from src.scoring.priority import compute_priority_scores, format_priority_for_display
from src.analysis.competitor import build_competitor_matrix, identify_hitwicket_specific_issues

st.set_page_config(
    page_title="Hitwicket Review Intelligence Dashboard",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for dark modern aesthetic
st.markdown("""
<style>
    .main {
        background-color: #0b0f19;
    }
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
    }
    h1, h2, h3, h4, h5, p {
        margin-top: 0.1rem !important;
        margin-bottom: 0.1rem !important;
    }
    .metric-card {
        background: linear-gradient(135deg, #161d31 0%, #101524 100%);
        border: 1px solid #28334e;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        margin-bottom: 8px;
    }
    .metric-val {
        font-size: 1.4rem;
        font-weight: 700;
        color: #818cf8;
        line-height: 1.2;
    }
    .metric-label {
        font-size: 0.7rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
    }
    .priority-badge-high {
        background-color: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid #ef4444;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
    }
    .priority-badge-med {
        background-color: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid #f59e0b;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
    }
    .priority-badge-low {
        background-color: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid #10b981;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 18px;
        border-radius: 8px;
        background-color: #141b2d;
        border: 1px solid #232d4b;
        color: #94a3b8;
    }
    .stTabs [aria-selected="true"] {
        background-color: #6366f1 !important;
        color: white !important;
    }
    .log-box {
        background-color: #0d1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 12px;
        font-family: monospace;
        font-size: 0.8rem;
        color: #58a6ff;
        max-height: 280px;
        overflow-y: auto;
        white-space: pre-wrap;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_data(ttl=5)
def load_data():
    """Load reviews and classifications from SQLite."""
    if not DB_PATH.exists():
        return pd.DataFrame(), pd.DataFrame()
    
    conn = sqlite3.connect(DB_PATH)
    
    query = """
    SELECT 
        r.id, r.game, r.source, r.review_id, r.review_date, r.rating, 
        r.review_text, r.app_version, r.thumbs_up, r.retrieved_at,
        c.primary_category, c.subcategory, c.sentiment, c.severity, 
        c.business_impact, c.issue, c.actionability, c.confidence, c.model_used
    FROM reviews r
    LEFT JOIN classifications c ON r.id = c.review_db_id
    WHERE r.review_date IS NOT NULL
    ORDER BY r.review_date DESC
    """
    try:
        df = pd.read_sql_query(query, conn)
        runs_df = pd.read_sql_query("SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 10", conn)
    except Exception:
        df = pd.DataFrame()
        runs_df = pd.DataFrame()
    finally:
        conn.close()
    
    return df, runs_df


def execute_pipeline(stages=["all"], max_reviews=100, games=None):
    """Execute pipeline with live streaming output."""
    cmd = [sys.executable, "run_pipeline.py", "--stages"] + stages + ["--max-reviews", str(max_reviews)]
    if games and len(games) > 0 and "all" not in games:
        cmd += ["--games"] + games
    
    with st.status(f"Running Pipeline: {' '.join(stages)}...", expanded=True) as status:
        log_placeholder = st.empty()
        logs = []
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=str(PROJECT_ROOT)
        )
        
        for line in iter(process.stdout.readline, ""):
            logs.append(line)
            # Keep last 15 lines visible
            log_placeholder.markdown(f"```text\n{''.join(logs[-15:])}\n```")
        
        process.stdout.close()
        return_code = process.wait()
        
        if return_code == 0:
            status.update(label="Pipeline Run Completed Successfully!", state="complete", expanded=False)
            st.cache_data.clear()
            time.sleep(0.5)
            st.rerun()
        else:
            status.update(label=f"Pipeline Failed with Exit Code {return_code}", state="error", expanded=True)


# ─────────────────────────────────────────────
# Sidebar: Control Panel & Filters
# ─────────────────────────────────────────────
st.sidebar.title("Hitwicket Pipeline")
st.sidebar.caption("Founder's Office Decision System")
st.sidebar.markdown("---")

st.sidebar.subheader("Pipeline Controller")

pipeline_mode = st.sidebar.selectbox(
    "Execution Target",
    ["Full Pipeline (All Stages)", "1. Ingest Reviews Only", "2. Classify Unclassified Only", "3. Score & Brief Only"]
)

max_revs_slider = st.sidebar.slider("Max Reviews per Game", min_value=50, max_value=2000, value=150, step=50)

if st.sidebar.button("Run Pipeline Now", type="primary", use_container_width=True):
    if pipeline_mode == "Full Pipeline (All Stages)":
        execute_pipeline(stages=["all"], max_reviews=max_revs_slider)
    elif pipeline_mode == "1. Ingest Reviews Only":
        execute_pipeline(stages=["ingest"], max_reviews=max_revs_slider)
    elif pipeline_mode == "2. Classify Unclassified Only":
        execute_pipeline(stages=["classify"], max_reviews=max_revs_slider)
    elif pipeline_mode == "3. Score & Brief Only":
        execute_pipeline(stages=["score", "brief"], max_reviews=max_revs_slider)

st.sidebar.markdown("---")
st.sidebar.subheader("View Filters")

# Game Selection
game_options = {"All Games": "all"}
for k, v in GAMES.items():
    game_options[v["name"]] = k

selected_game_label = st.sidebar.selectbox("Select Game View", list(game_options.keys()))
selected_game_key = game_options[selected_game_label]

df, runs_df = load_data()

if not df.empty:
    df["review_datetime"] = pd.to_datetime(df["review_date"])
    max_date = df["review_datetime"].max().date()
    min_date = df["review_datetime"].min().date()
    
    st.sidebar.markdown("### Date Filter")
    time_filter_type = st.sidebar.radio("Filter By", ["Last X Days", "Custom Date Range"], horizontal=True)
    
    start_date, end_date = min_date, max_date
    
    if time_filter_type == "Last X Days":
        max_possible_days = (max_date - min_date).days
        max_possible_days = max(1, max_possible_days)
        
        selected_days = st.sidebar.slider("Number of Days", min_value=1, max_value=max_possible_days, value=max_possible_days)
        start_date = max_date - pd.Timedelta(days=selected_days)
    else:
        selected_dates = st.sidebar.date_input(
            "Select Date Range",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date
        )
        if len(selected_dates) == 2:
            start_date, end_date = selected_dates
            
    df = df[(df["review_datetime"].dt.date >= start_date) & (df["review_datetime"].dt.date <= end_date)]

st.sidebar.markdown("---")
st.sidebar.markdown("### Database Status")
if not df.empty:
    st.sidebar.write(f"**Total Ingested:** {len(df):,} reviews")
    st.sidebar.write(f"**Classified:** {df['primary_category'].notna().sum():,} reviews")
    st.sidebar.write(f"**Coverage:** {df['review_datetime'].min().date()} to {df['review_datetime'].max().date()}")
else:
    st.sidebar.warning("Database empty. Click 'Run Pipeline' above!")

if st.sidebar.button("Refresh Data", use_container_width=True):
    st.cache_data.clear()
    st.rerun()

# ─────────────────────────────────────────────
# Empty State Handling
# ─────────────────────────────────────────────
if df.empty:
    st.title("Hitwicket Review Intelligence Dashboard")
    st.info("Welcome! The database has not been initialized with review data yet.")
    st.markdown("""
    Click the button below to fetch real 90-day reviews from Google Play for **Hitwicket**, **Tennis Clash**, and **Baseball Clash**:
    """)
    if st.button("Ingest & Run Pipeline Now", type="primary"):
        execute_pipeline(stages=["all"], max_reviews=100)
    st.stop()

# ─────────────────────────────────────────────
# Data Preparation
# ─────────────────────────────────────────────
if selected_game_key != "all":
    view_df = df[df["game"] == selected_game_key].copy()
else:
    view_df = df.copy()

classified_df = view_df[view_df["primary_category"].notna()].copy()
all_classified_records = df[df["primary_category"].notna()].to_dict("records")

# ─────────────────────────────────────────────
# Navigation Tabs (Header Buttons)
# ─────────────────────────────────────────────
if "active_tab" not in st.session_state:
    st.session_state["active_tab"] = "Overview"

nav_tabs = [
    "Overview",
    "Priority Issues",
    "90-Second Founder Brief",
    "Competitor Benchmark",
    "Game vs Game Analytics",
    "Review Explorer",
    "Pipeline Run History"
]

cols = st.columns(len(nav_tabs))
for col, tab_name in zip(cols, nav_tabs):
    is_active = (st.session_state["active_tab"] == tab_name)
    if col.button(tab_name, type="primary" if is_active else "secondary", use_container_width=True):
        st.session_state["active_tab"] = tab_name
        st.rerun()

active_tab = st.session_state["active_tab"]
st.markdown("---")

# ─────────────────────────────────────────────
# Page Context (Title)
# ─────────────────────────────────────────────
title_game = selected_game_label if selected_game_key != "all" else "All Titles (Hitwicket vs Competitors)"
st.title(f"Review Intelligence — {title_game}")
st.caption(f"Google Play Public Reviews • Last 90 Days • {len(view_df):,} reviews in view")

# ─────────────────────────────────────────────
# Metric Rows (Overview)
# ─────────────────────────────────────────────
def render_metric_row(title, df_subset):
    st.markdown(f"**{title}**")
    classified_count = df_subset["primary_category"].notna().sum()
    
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label" title="Total number of app reviews collected over the selected time period.">90d Ingested ℹ️</div>
            <div class="metric-val">{len(df_subset):,}</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        avg_rating = df_subset["rating"].mean() if not df_subset.empty else 0
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label" title="Average star rating out of 5 for the selected time period.">Avg Rating ℹ️</div>
            <div class="metric-val">{avg_rating:.2f} ★</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        neg_pct = (df_subset["rating"] <= 2).mean() * 100 if not df_subset.empty else 0
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label" title="Percentage of reviews with a 1 or 2 star rating, generally indicating dissatisfaction.">Negative (1-2★) ℹ️</div>
            <div class="metric-val" style="color:#f87171">{neg_pct:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        pos_pct = (df_subset["rating"] >= 4).mean() * 100 if not df_subset.empty else 0
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label" title="Percentage of reviews with a 4 or 5 star rating, generally indicating satisfaction.">Positive (4-5★) ℹ️</div>
            <div class="metric-val" style="color:#34d399">{pos_pct:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col5:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label" title="Number of substantive reviews that were detailed enough to be tagged with categories by the AI.">Classified ℹ️</div>
            <div class="metric-val" style="color:#fbbf24">{classified_count:,}</div>
        </div>
        """, unsafe_allow_html=True)


if active_tab == "Overview":
    if selected_game_key == "all":
        render_metric_row("Overall (All Games)", view_df)
        for k, v in GAMES.items():
            game_subset = view_df[view_df["game"] == k]
            render_metric_row(f"{v['name']}", game_subset)
    else:
        render_metric_row(f"{selected_game_label}", view_df)



# ─────────────────────────────────────────────
# Tab 1: Top Priority Issues
# ─────────────────────────────────────────────
if active_tab == "Priority Issues":
    st.subheader("Prioritized Issues (Formula-Derived)", help="Issues scored mathematically based on frequency, severity, business impact, and trajectory.")
    st.markdown("""
    Ranked by explicit Priority Formula:  
    $$\\text{Priority} = 0.30 \\times \\text{Frequency} + 0.25 \\times \\text{Severity} + 0.25 \\times \\text{Business Impact} + 0.20 \\times \\text{Trend}$$
    """)

    target_game = "hitwicket" if selected_game_key == "all" else selected_game_key
    if selected_game_key == "all":
        st.info("Displaying priority scores for **Hitwicket**. Select another game in the sidebar to view its ranking.")

    priorities = compute_priority_scores(all_classified_records, game=target_game)

    if not priorities:
        st.info("No classified reviews available for this game yet. Run the classification stage.")
    else:
        for idx, p in enumerate(priorities, 1):
            score = p["priority_int"]
            if score >= 45:
                badge_class = "priority-badge-high"
            elif score >= 30:
                badge_class = "priority-badge-med"
            else:
                badge_class = "priority-badge-low"

            cat = p["primary_category"]
            subcat = p["subcategory"]

            # Filter sample reviews for this category
            sample_revs = view_df[
                (view_df["primary_category"] == cat) & 
                (view_df["subcategory"] == subcat) & 
                (view_df["review_text"].notna())
            ].head(3)

            with st.container():
                st.markdown(f"""
                <div style="background:#131828; border:1px solid #232d4b; border-radius:10px; padding:16px; margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h4 style="margin:0; color:#fff;">#{idx} {cat} <span style="color:#818cf8;">{subcat}</span></h4>
                        <span class="{badge_class}">Priority Score: {score}/100</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:0.85rem; color:#94a3b8; margin-top:8px;">
                        <div><b>Frequency:</b> {p['frequency_pct']:.1f}% ({p['review_count']} reviews)</div>
                        <div><b>Severity:</b> {p['avg_severity']:.1f}/5.0</div>
                        <div><b>Business Impact:</b> {p['avg_business_impact']:.1f}/5.0</div>
                        <div><b>Trend:</b> {p['trend_label']}</div>
                    </div>
                    {f'<div style="color:#fbbf24; font-size:0.8rem; margin-top:8px;">{p["sample_note"]}</div>' if p.get('sample_note') else ''}
                </div>
                """, unsafe_allow_html=True)

                with st.expander(f"View Sample Reviews for {cat} {subcat} ({len(sample_revs)} samples)"):
                    for _, r in sample_revs.iterrows():
                        st.markdown(f"**[{r['rating']}★]** *\"{r['review_text']}\"* — `{r['review_date'][:10]}`")

# ─────────────────────────────────────────────
# Tab 2: 90-Second Founder Brief
# ─────────────────────────────────────────────
if active_tab == "90-Second Founder Brief":
    col_b_head, col_b_btn = st.columns([4, 1])
    with col_b_head:
        st.subheader("Executive 90-Second Founder Brief", help="AI-generated summary highlighting urgent action items and competitor moves.")
        st.caption("Auto-generated weekly executive report focusing on decisions, competitive signals, and actions.")
    with col_b_btn:
        if st.button("Regenerate Brief", use_container_width=True):
            execute_pipeline(stages=["score", "brief"], max_reviews=len(view_df))

    brief_files = list(OUTPUTS_DIR.glob("**/founder_brief_*.md"))
    if brief_files:
        latest_brief = sorted(brief_files)[-1]
        brief_text = latest_brief.read_text(encoding="utf-8")
        st.markdown(f"""
        <div style="background:#131828; border:1px solid #232d4b; border-radius:12px; padding:24px; line-height:1.8;">
        {brief_text}
        </div>
        """, unsafe_allow_html=True)
    else:
        st.info("No generated brief file found. Run 'Score & Brief Only' to generate.")

# ─────────────────────────────────────────────
# Tab 3: Competitor Matrix
# ─────────────────────────────────────────────
if active_tab == "Competitor Benchmark":
    st.subheader("Cross-Game Benchmark Matrix", help="Compares the volume of review categories across different games to highlight relative strengths and weaknesses.")
    st.markdown("Category volume distribution comparing Hitwicket against Tennis Clash and Baseball Clash:")

    matrix_data = build_competitor_matrix(all_classified_records)
    matrix = matrix_data["matrix"]

    comp_df = pd.DataFrame(matrix).T
    rename_cols = {k: GAMES[k]["name"] for k in GAMES if k in comp_df.columns}
    comp_df = comp_df.rename(columns=rename_cols)

    st.dataframe(comp_df, use_container_width=True)
    st.caption("**High**: >20% of reviews • **Medium**: 10–20% • **Low**: <10% • Generated from real classified reviews")

    st.markdown("---")
    st.subheader("Strategic Insights")

    specific_issues = identify_hitwicket_specific_issues(
        matrix_data, 
        compute_priority_scores(all_classified_records, game="hitwicket")
    )

    if specific_issues:
        for item in specific_issues:
            if item.get("specificity") == "hitwicket_specific":
                st.warning(f"**Hitwicket-Specific Problem**: `{item['primary_category']}` is High for Hitwicket, but Low/Medium for rivals. High priority for differentiation.")
            else:
                st.info(f"**Industry-Wide Problem**: `{item['primary_category']}` is a shared category pain point across Hitwicket and its competitors.")
    else:
        st.write("All 3 games show similar category distribution profiles.")

# ─────────────────────────────────────────────
# Tab 4: Game vs Game Analytics
# ─────────────────────────────────────────────
if active_tab == "Game vs Game Analytics":
    st.subheader("Game vs Game Analytics", help="Direct comparison of average ratings, sentiment distributions, and review volume across the tracked games.")
    st.markdown("Compare ratings, sentiment, and review volume across Hitwicket and its competitors.")

    # We use the full 'df' instead of 'view_df' to always show comparison across all games
    if df.empty or len(df["game"].unique()) < 2:
        st.info("Need data from multiple games to show comparison. Please run the pipeline for all games.")
    else:
        # Map game keys to display names
        comp_data = df.copy()
        comp_data["Game Name"] = comp_data["game"].map(lambda x: GAMES.get(x, {}).get("name", x))
        
        st.markdown("### Key Metrics Overview")
        
        # Calculate volume
        volume = comp_data["Game Name"].value_counts().rename("Review Volume")
        
        # Calculate average rating
        avg_rating = comp_data.groupby("Game Name")["rating"].mean().round(2).rename("Avg Rating")
        
        # Calculate % 4-5 stars and % 1-2 stars
        pos_pct = comp_data[comp_data["rating"] >= 4].groupby("Game Name").size().div(comp_data.groupby("Game Name").size()) * 100
        neg_pct = comp_data[comp_data["rating"] <= 2].groupby("Game Name").size().div(comp_data.groupby("Game Name").size()) * 100
        
        pos_pct = pos_pct.fillna(0).round(1).rename("Positive (4-5★) %")
        neg_pct = neg_pct.fillna(0).round(1).rename("Negative (1-2★) %")
        
        metrics_df = pd.concat([volume, avg_rating, pos_pct, neg_pct], axis=1)
        st.dataframe(metrics_df, use_container_width=True)

        st.markdown("### Sentiment Breakdown (%)")
        sent_df = comp_data.dropna(subset=["sentiment"])
        if not sent_df.empty:
            sent_dist = sent_df.groupby(["Game Name", "sentiment"]).size().unstack(fill_value=0)
            sent_dist_pct = sent_dist.div(sent_dist.sum(axis=1), axis=0) * 100
            st.dataframe(sent_dist_pct.round(1), use_container_width=True)
        else:
            st.info("No sentiment data available. Run classification first.")

# ─────────────────────────────────────────────
# Tab 5: Review Explorer
# ─────────────────────────────────────────────
if active_tab == "Review Explorer":
    st.subheader("Real-Time Review Explorer", help="Search, filter, and export the raw review database.")

    exp_col1, exp_col2, exp_col3, exp_col4 = st.columns(4)
    with exp_col1:
        search_query = st.text_input("Search text / keyword", "")
    with exp_col2:
        selected_category = st.selectbox("Category", ["All"] + CATEGORIES)
    with exp_col3:
        selected_rating = st.multiselect("Rating", [1, 2, 3, 4, 5], default=[1, 2, 3, 4, 5])
    with exp_col4:
        selected_sentiment = st.multiselect("Sentiment", ["positive", "negative", "mixed", "neutral"], default=["positive", "negative", "mixed", "neutral"])

    filtered_df = view_df.copy()

    if search_query:
        filtered_df = filtered_df[filtered_df["review_text"].fillna("").str.contains(search_query, case=False)]
    if selected_category != "All":
        filtered_df = filtered_df[filtered_df["primary_category"] == selected_category]
    if selected_rating:
        filtered_df = filtered_df[filtered_df["rating"].isin(selected_rating)]
    if selected_sentiment:
        filtered_df = filtered_df[filtered_df["sentiment"].isin(selected_sentiment) | filtered_df["sentiment"].isna()]

    st.write(f"Showing **{len(filtered_df):,}** reviews:")

    display_cols = ["game", "rating", "review_date", "primary_category", "subcategory", "sentiment", "severity", "review_text"]
    st.dataframe(
        filtered_df[display_cols].rename(columns={
            "game": "Game",
            "rating": "Stars",
            "review_date": "Date",
            "primary_category": "Category",
            "subcategory": "Subcategory",
            "sentiment": "Sentiment",
            "severity": "Severity",
            "review_text": "Review Text"
        }),
        use_container_width=True,
        height=420
    )

    csv_data = filtered_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        "Download Filtered Dataset (CSV)",
        csv_data,
        "filtered_reviews.csv",
        "text/csv",
        key='download-filtered-csv'
    )

# ─────────────────────────────────────────────
# Tab 6: Pipeline Run History
# ─────────────────────────────────────────────
if active_tab == "Pipeline Run History":
    st.subheader("Pipeline Execution Audit Log", help="Record of all pipeline runs, including how many reviews were fetched and classified.")
    if not runs_df.empty:
        st.dataframe(
            runs_df.rename(columns={
                "id": "Run ID",
                "run_at": "Timestamp (UTC)",
                "reviews_fetched": "Fetched",
                "within_90_days": "90d Kept",
                "new_reviews": "New Added",
                "classified": "Classified",
                "classification_failures": "Failures",
                "model_used": "Model",
                "stages_run": "Stages"
            })[["Run ID", "Timestamp (UTC)", "Stages", "Fetched", "New Added", "Classified", "Failures", "Model"]],
            use_container_width=True
        )
    else:
        st.info("No execution runs recorded yet.")

st.markdown("---")
st.caption("Hitwicket Review Intelligence • Decision Pipeline • Real 90-Day Public Review Data")
