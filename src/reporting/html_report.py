"""
HTML report generator.
Produces a self-contained, interactive HTML dashboard with:
- Game selector tabs
- Summary metrics
- Top priority issues
- Cross-game competitor matrix
- 90-second founder brief
- Interactive client-side review explorer with live search and category filter
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.config import GAMES, CATEGORIES, TOP_N_ISSUES

logger = logging.getLogger(__name__)

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hitwicket Review Intelligence — {analysis_date}</title>
<style>
  :root {{
    --bg: #0b0f19;
    --surface: #141b2d;
    --surface2: #1f2940;
    --accent: #6366f1;
    --accent-light: #818cf8;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --positive: #10b981;
    --negative: #ef4444;
    --warning: #f59e0b;
    --border: #2e3856;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); padding: 24px; }}
  .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }}
  h1 {{ font-size: 1.7rem; font-weight: 700; color: #fff; }}
  h2 {{ font-size: 1.15rem; font-weight: 600; color: #fff; margin: 20px 0 12px; }}
  .badge {{ background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }}
  
  .tabs {{ display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }}
  .tab {{ padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; border: 1px solid var(--border); background: var(--surface); color: var(--muted); transition: all 0.2s ease; }}
  .tab.active {{ background: var(--accent); color: white; border-color: var(--accent); }}
  .tab:hover:not(.active) {{ background: var(--surface2); color: var(--text); }}
  
  .panel {{ display: none; }}
  .panel.active {{ display: block; }}
  
  .grid3 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }}
  .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }}
  .stat-val {{ font-size: 2.2rem; font-weight: 700; color: var(--accent-light); }}
  .stat-label {{ font-size: 0.8rem; color: var(--muted); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }}
  
  .priority-item {{ background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; }}
  .priority-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }}
  .priority-title {{ font-weight: 700; font-size: 0.95rem; color: #fff; }}
  .priority-score {{ padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }}
  .priority-score.high {{ background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid #ef4444; }}
  .priority-score.medium {{ background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid #f59e0b; }}
  .priority-score.low {{ background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; }}
  
  .meta-row {{ display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.82rem; color: var(--muted); }}
  .meta-row span {{ color: var(--text); font-weight: 600; }}
  .sample-note {{ font-size: 0.75rem; color: var(--warning); margin-top: 8px; }}
  
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ text-align: left; padding: 10px 14px; background: var(--surface2); color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }}
  td {{ padding: 10px 14px; border-bottom: 1px solid var(--border); }}
  tr:hover td {{ background: rgba(99,102,241,0.05); }}
  
  .label-high {{ color: #f87171; font-weight: 700; }}
  .label-medium {{ color: #fbbf24; font-weight: 600; }}
  .label-low {{ color: #34d399; font-weight: 500; }}
  .label-na {{ color: var(--muted); }}
  
  .brief-content {{ white-space: pre-wrap; font-size: 0.9rem; line-height: 1.8; background: var(--surface); border-radius: 12px; padding: 24px; border: 1px solid var(--border); }}
  .note {{ background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: var(--warning); margin: 16px 0; }}
  
  .search-box {{ width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 0.85rem; margin-bottom: 14px; outline: none; }}
  .search-box:focus {{ border-color: var(--accent); }}
  .footer {{ text-align: center; color: var(--muted); font-size: 0.78rem; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>🏏 Hitwicket Review Intelligence Dashboard</h1>
    <p style="color:var(--muted);font-size:0.85rem;margin-top:4px">Founder's Office Decision Pipeline · Generated {analysis_date}</p>
  </div>
  <div class="badge">Google Play · Last 90 Days</div>
</div>

<div class="tabs" id="tabs">
  <div class="tab active" onclick="switchTab('overview')">Overview</div>
  {game_tabs}
  <div class="tab" onclick="switchTab('competitor')">Competitor Matrix</div>
  <div class="tab" onclick="switchTab('brief')">90s Founder Brief</div>
  <div class="tab" onclick="switchTab('explorer')">Review Explorer</div>
</div>

{panels}

<div class="footer">
  Data Source: Google Play Store • Last 90 Days • {total_reviews} total reviews ingested across 3 titles<br>
  Formula: Priority = 0.30×Freq + 0.25×Severity + 0.25×BusinessImpact + 0.20×Trend
</div>

<script>
let allReviewsData = {reviews_json};

function switchTab(id) {{
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
}}

function filterReviews() {{
  let query = document.getElementById('reviewSearch').value.toLowerCase();
  let gameFilter = document.getElementById('reviewGameFilter').value;
  let catFilter = document.getElementById('reviewCatFilter').value;
  let tbody = document.getElementById('reviewTableBody');
  
  let filtered = allReviewsData.filter(r => {{
    let matchText = (r.review_text || '').toLowerCase().includes(query) || (r.issue || '').toLowerCase().includes(query);
    let matchGame = gameFilter === 'all' || r.game === gameFilter;
    let matchCat = catFilter === 'all' || (r.primary_category || '') === catFilter;
    return matchText && matchGame && matchCat;
  }});
  
  document.getElementById('reviewCountDisplay').innerText = filtered.length + ' matching reviews';
  
  tbody.innerHTML = filtered.slice(0, 100).map(r => `
    <tr>
      <td><b>${{r.game}}</b></td>
      <td>${{'★'.repeat(r.rating || 0)}}${{'☆'.repeat(5 - (r.rating || 0))}}</td>
      <td>${{(r.review_date || '').slice(0,10)}}</td>
      <td><span style="background:#1f2940;padding:2px 8px;border-radius:4px;font-size:0.75rem;">${{r.primary_category || 'Unclassified'}}</span></td>
      <td>${{r.subcategory || '-'}}</td>
      <td><span style="color:${{r.sentiment === 'positive' ? '#10b981' : (r.sentiment === 'negative' ? '#ef4444' : '#fbbf24')}}">${{r.sentiment || '-'}}</span></td>
      <td>${{r.review_text || 'No text'}}</td>
    </tr>
  `).join('');
}}

window.addEventListener('DOMContentLoaded', () => {{
  if (document.getElementById('reviewSearch')) {{
    filterReviews();
  }}
}});
</script>
</body>
</html>
"""

OVERVIEW_PANEL = """
<div id="panel-overview" class="panel active">
  <h2>Pipeline Ingestion & Coverage Summary</h2>
  <div class="grid3">
    {summary_cards}
  </div>
  <h2>Top Priority Issues — Hitwicket</h2>
  {hitwicket_top}
  <div class="note">⚠️ Note: Apple App Store reviews are excluded due to RSS parser schema changes. Google Play is used consistently across all 3 titles.</div>
</div>
"""

GAME_PANEL = """
<div id="panel-{game_key}" class="panel">
  <h2>{game_name} Overview</h2>
  <div class="grid3">
    <div class="card stat">
      <div class="stat-val">{review_count}</div>
      <div class="stat-label">90-Day Reviews</div>
    </div>
    <div class="card stat">
      <div class="stat-val">{classified_count}</div>
      <div class="stat-label">Classified Substantive</div>
    </div>
    <div class="card stat">
      <div class="stat-val">{avg_rating}★</div>
      <div class="stat-label">Average Rating</div>
    </div>
  </div>
  <h2>Priority Ranked Issues</h2>
  {priority_items}
</div>
"""

COMPETITOR_PANEL = """
<div id="panel-competitor" class="panel">
  <h2>Competitor Comparison Matrix</h2>
  <div class="note">{data_note}</div>
  <div class="card" style="margin-top:14px;overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>Category</th>
          {game_headers}
        </tr>
      </thead>
      <tbody>
        {matrix_rows}
      </tbody>
    </table>
  </div>
  <h3 style="margin-top:20px;font-size:0.95rem;color:var(--muted)">Label Definitions</h3>
  <p style="font-size:0.82rem;color:var(--muted);margin-top:6px;">
    <strong class="label-high">High</strong>: &gt;20% of reviews mention this category &nbsp;|&nbsp;
    <strong class="label-medium">Medium</strong>: 10–20% &nbsp;|&nbsp;
    <strong class="label-low">Low</strong>: &lt;10% &nbsp;|&nbsp;
    Values computed deterministically from real classified review datasets.
  </p>
</div>
"""

BRIEF_PANEL = """
<div id="panel-brief" class="panel">
  <h2>Weekly Executive Founder Brief</h2>
  <div class="brief-content">{brief_content}</div>
</div>
"""

EXPLORER_PANEL = """
<div id="panel-explorer" class="panel">
  <h2>Review Explorer & Live Search</h2>
  <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:12px; margin-bottom:12px;">
    <input type="text" id="reviewSearch" class="search-box" placeholder="Search keywords (e.g. pay to win, crash, matchmaking, ads)..." onkeyup="filterReviews()">
    <select id="reviewGameFilter" class="search-box" onchange="filterReviews()">
      <option value="all">All Games</option>
      <option value="hitwicket">Hitwicket</option>
      <option value="tennis_clash">Tennis Clash</option>
      <option value="baseball_clash">Baseball Clash</option>
    </select>
    <select id="reviewCatFilter" class="search-box" onchange="filterReviews()">
      <option value="all">All Categories</option>
      <option value="Gameplay">Gameplay</option>
      <option value="Progression">Progression</option>
      <option value="Monetization">Monetization</option>
      <option value="Experience">Experience</option>
      <option value="Competition & Social">Competition & Social</option>
    </select>
  </div>
  <div id="reviewCountDisplay" style="font-size:0.85rem;color:var(--muted);margin-bottom:12px;"></div>
  <div class="card" style="overflow-x:auto;max-height:600px;overflow-y:auto;">
    <table>
      <thead>
        <tr>
          <th>Game</th>
          <th>Rating</th>
          <th>Date</th>
          <th>Category</th>
          <th>Subcategory</th>
          <th>Sentiment</th>
          <th>Review Text</th>
        </tr>
      </thead>
      <tbody id="reviewTableBody">
      </tbody>
    </table>
  </div>
</div>
"""


def _priority_score_class(score: int) -> str:
    if score >= 50:
        return "high"
    elif score >= 30:
        return "medium"
    return "low"


def _label_class(label: str) -> str:
    if label == "High":
        return "label-high"
    elif label == "Medium":
        return "label-medium"
    elif label == "Low":
        return "label-low"
    return "label-na"


def _render_priority_items(priorities: list[dict], top_n: int = TOP_N_ISSUES) -> str:
    items = []
    for p in priorities[:top_n]:
        score_cls = _priority_score_class(p["priority_int"])
        items.append(f"""
      <div class="priority-item">
        <div class="priority-header">
          <div class="priority-title">{p['primary_category']} / {p['subcategory']}</div>
          <div class="priority-score {score_cls}">Priority {p['priority_int']}/100</div>
        </div>
        <div class="meta-row">
          <div>Frequency: <span>{p['frequency_pct']:.1f}% ({p['review_count']} reviews)</span></div>
          <div>Severity: <span>{p['avg_severity']:.1f}/5</span></div>
          <div>Biz Impact: <span>{p['avg_business_impact']:.1f}/5</span></div>
          <div>Trend: <span>{p['trend_label']}</span></div>
        </div>
        {f'<div class="sample-note">{p["sample_note"]}</div>' if p.get("sample_note") else ""}
      </div>""")
    if not items:
        return "<p style='color:var(--muted)'>No classified reviews available yet.</p>"
    return "\n".join(items)


def generate_html_report(
    all_classified: list[dict],
    priority_by_game: dict[str, list[dict]],
    matrix_data: dict,
    brief_path: Optional[Path],
    output_dir: Path,
) -> Path:
    """Generate a self-contained HTML dashboard with review explorer."""
    analysis_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    total_reviews = len(all_classified)

    # Summary stats per game
    game_counts = {}
    game_ratings = {}
    for r in all_classified:
        g = r.get("game", "")
        game_counts[g] = game_counts.get(g, 0) + 1
        if r.get("rating"):
            game_ratings.setdefault(g, []).append(r["rating"])

    summary_cards = ""
    for game_key, game_info in GAMES.items():
        count = game_counts.get(game_key, 0)
        ratings = game_ratings.get(game_key, [0])
        avg_r = sum(ratings)/len(ratings) if ratings else 0
        priorities = priority_by_game.get(game_key, [])
        top_issue = f"{priorities[0]['primary_category']} ({priorities[0]['priority_int']}/100)" if priorities else "N/A"
        summary_cards += f"""
      <div class="card">
        <div class="stat-val">{count}</div>
        <div class="stat-label">{game_info['name']} (90d Reviews)</div>
        <div style="font-size:0.8rem;color:var(--muted);margin-top:8px;">Avg: {avg_r:.2f}★ • Top: {top_issue}</div>
      </div>"""

    # Hitwicket top issues
    hw_priorities = priority_by_game.get("hitwicket", [])
    hitwicket_top = _render_priority_items(hw_priorities)

    overview = OVERVIEW_PANEL.format(
        summary_cards=summary_cards,
        hitwicket_top=hitwicket_top,
    )

    # Game tabs and panels
    game_tabs = ""
    game_panels = ""
    for game_key, game_info in GAMES.items():
        game_name = game_info["name"]
        game_tabs += f'<div class="tab" onclick="switchTab(\'{game_key}\')">{game_name}</div>\n'

        priorities = priority_by_game.get(game_key, [])
        count = game_counts.get(game_key, 0)
        ratings = game_ratings.get(game_key, [0])
        avg_r = sum(ratings)/len(ratings) if ratings else 0

        game_panels += GAME_PANEL.format(
            game_key=game_key,
            game_name=game_name,
            review_count=count,
            classified_count=sum(p["review_count"] for p in priorities),
            avg_rating=f"{avg_r:.2f}",
            priority_items=_render_priority_items(priorities),
        )

    # Competitor matrix panel
    matrix = matrix_data.get("matrix", {})
    game_keys = list(GAMES.keys())
    game_names = [GAMES[k]["name"] for k in game_keys]

    game_headers = "".join(f"<th>{n}</th>" for n in game_names)
    matrix_rows = ""
    for cat in CATEGORIES:
        row = f"<tr><td><strong>{cat}</strong></td>"
        for gk in game_keys:
            label = matrix.get(cat, {}).get(gk, "N/A")
            cls = _label_class(label)
            row += f'<td class="{cls}">{label}</td>'
        row += "</tr>"
        matrix_rows += row

    competitor_panel = COMPETITOR_PANEL.format(
        data_note=matrix_data.get("data_note", ""),
        game_headers=game_headers,
        matrix_rows=matrix_rows,
    )

    # Brief panel
    brief_content = "No brief generated yet."
    if brief_path and brief_path.exists():
        brief_content = brief_path.read_text(encoding="utf-8")

    brief_panel = BRIEF_PANEL.format(brief_content=brief_content.replace("<", "&lt;").replace(">", "&gt;"))

    explorer_panel = EXPLORER_PANEL

    # Assemble panels
    panels = overview + game_panels + competitor_panel + brief_panel + explorer_panel

    # JSON for client-side search
    reviews_json = json.dumps([{
        "game": r.get("game"),
        "rating": r.get("rating"),
        "review_date": r.get("review_date"),
        "primary_category": r.get("primary_category"),
        "subcategory": r.get("subcategory"),
        "sentiment": r.get("sentiment"),
        "issue": r.get("issue"),
        "review_text": r.get("review_text"),
    } for r in all_classified])

    html = HTML_TEMPLATE.format(
        analysis_date=analysis_date,
        game_tabs=game_tabs,
        panels=panels,
        total_reviews=total_reviews,
        reviews_json=reviews_json,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "report.html"
    report_path.write_text(html, encoding="utf-8")
    
    # Also write a static copy to root outputs/report.html for easy bookmarking
    (output_dir.parent / "report.html").write_text(html, encoding="utf-8")
    logger.info(f"HTML report saved: {report_path}")

    return report_path
