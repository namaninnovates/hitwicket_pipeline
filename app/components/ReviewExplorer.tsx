import { useState, useEffect } from "react";
import { Search, Filter, Download, Star, Database, Sparkles, RotateCcw, Calendar, Hash, Check } from "lucide-react";
import InfoTooltip from "./Tooltip";
import CricketLoader from "./CricketLoader";

export default function ReviewExplorer({ games }: { games: any }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState("All");
  const [category, setCategory] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const [sentiment, setSentiment] = useState("All");
  const [rating, setRating] = useState("All");
  const [timeWindow, setTimeWindow] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reviewLimit, setReviewLimit] = useState(200);

  const [taxonomy, setTaxonomy] = useState<{
    categories: string[];
    subcategories: Record<string, string[]>;
    sentiments: string[];
  }>({
    categories: ["Gameplay", "Progression", "Monetization", "Experience", "Competition & Social"],
    subcategories: {
      Gameplay: ["Match / mechanics", "Strategy / tactics", "Balance / fairness", "RNG / randomness"],
      Progression: ["Progression speed", "Rewards", "Upgrades", "Difficulty / grind"],
      Monetization: ["Pricing", "Ads", "Purchases / IAP", "Pay-to-win pressure", "Offer design"],
      Experience: ["Bugs / crashes", "Performance", "UI / UX", "Onboarding"],
      "Competition & Social": ["Matchmaking", "PvP / ranked", "Clubs / community", "Events"],
    },
    sentiments: ["positive", "negative", "mixed", "neutral"],
  });

  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories?.length) {
          setTaxonomy(data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchReviews = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (selectedGame !== "All") params.append("game", selectedGame);
    if (category !== "All") params.append("category", category);
    if (subcategory !== "All") params.append("subcategory", subcategory);
    if (sentiment !== "All") params.append("sentiment", sentiment);
    if (rating !== "All") params.append("rating", rating);
    params.append("limit", String(reviewLimit));

    if (timeWindow !== "All" && timeWindow !== "custom") {
      params.append("days", timeWindow);
    } else if (timeWindow === "custom") {
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
    }

    fetch(`/api/reviews?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedGame, category, subcategory, sentiment, rating, timeWindow, startDate, endDate, reviewLimit]);

  const handleSearch = (e: any) => {
    e.preventDefault();
    fetchReviews();
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedGame("All");
    setCategory("All");
    setSubcategory("All");
    setSentiment("All");
    setRating("All");
    setTimeWindow("All");
    setStartDate("");
    setEndDate("");
    setReviewLimit(200);
  };

  const exportCSV = () => {
    if (!reviews.length) return;
    const headers = ["Game", "Rating", "Date", "Category", "Subcategory", "Sentiment", "Severity", "Impact", "Review Text"];
    const rows = reviews.map((r) => [
      `"${games[r.game]?.name || r.game}"`,
      r.rating,
      `"${r.review_date || ""}"`,
      `"${r.primary_category || ""}"`,
      `"${r.subcategory || ""}"`,
      `"${r.sentiment || ""}"`,
      r.severity || "",
      r.business_impact || "",
      `"${(r.review_text || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reviews_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableSubcategories = category !== "All" && taxonomy.subcategories[category] ? taxonomy.subcategories[category] : [];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
              <span>Review Explorer &amp; Interactive Filters</span>
              <InfoTooltip content="Search, filter, inspect, and export all raw Google Play reviews stored in the Neon PostgreSQL database." />
            </h2>
            <p className="text-xs text-slate-400">Click any filter button below to instantly slice and inspect raw feedback</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset All</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={!reviews.length}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] disabled:opacity-40 cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV ({reviews.length})</span>
          </button>
        </div>
      </div>

      {/* Button-Based Multi-Criteria Filter Console */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        {/* Search Query Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword in reviews (e.g. crash, umpire, lag, unfair, money, refund, ads)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-200 transition-all cursor-pointer shadow-sm"
          >
            Search
          </button>
        </form>

        {/* 1. Game Selection Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <div className="flex items-center w-28 shrink-0">
            <span className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Game:</span>
            <InfoTooltip content="Filter reviews by game title or click the active game to unselect back to All." size={11} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedGame("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedGame === "All"
                  ? "bg-indigo-600 text-white border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
              }`}
            >
              All Games
            </button>
            {Object.entries(games).map(([key, g]: any) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGame(selectedGame === key ? "All" : key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedGame === key
                    ? "bg-indigo-600 text-white border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
                title={selectedGame === key ? "Click to unselect" : `Filter by ${g.name}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Primary Category Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center w-28 shrink-0">
            <span className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Category:</span>
            <InfoTooltip content="Filter by primary NLP classification topic. Click active category to unselect." size={11} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCategory("All");
                setSubcategory("All");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                category === "All"
                  ? "bg-fuchsia-600 text-white border-fuchsia-400/50 shadow-[0_0_12px_rgba(217,70,239,0.35)]"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
              }`}
            >
              All Categories
            </button>
            {taxonomy.categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  if (category === c) {
                    setCategory("All");
                    setSubcategory("All");
                  } else {
                    setCategory(c);
                    setSubcategory("All");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  category === c
                    ? "bg-fuchsia-600 text-white border-fuchsia-400/50 shadow-[0_0_12px_rgba(217,70,239,0.35)]"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
                title={category === c ? "Click to unselect" : `Filter by ${c}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Subcategories Buttons (when category is selected) */}
        {availableSubcategories.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex items-center w-28 shrink-0">
              <span className="text-[0.68rem] uppercase font-bold text-fuchsia-300 tracking-wider">Subcategory:</span>
              <InfoTooltip content="Filter by granular problem tag. Click active tag to unselect." size={11} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSubcategory("All")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  subcategory === "All"
                    ? "bg-white/20 text-white border-white/20"
                    : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              {availableSubcategories.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setSubcategory(subcategory === sc ? "All" : sc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    subcategory === sc
                      ? "bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400/40"
                      : "bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                  title={subcategory === sc ? "Click to unselect" : `Filter by ${sc}`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Time Window Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center w-28 shrink-0">
            <span className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Time Window:</span>
            <InfoTooltip content="Filter reviews by when they were posted on Google Play. Click active window to unselect." size={11} />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {[
              { id: "All", label: "Unlimited (All Time)" },
              { id: "7", label: "7 Days" },
              { id: "14", label: "14 Days" },
              { id: "30", label: "30 Days" },
              { id: "60", label: "60 Days" },
              { id: "90", label: "90 Days" },
              { id: "180", label: "180 Days" },
              { id: "365", label: "1 Year" },
              { id: "custom", label: "Custom Range" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeWindow(timeWindow === t.id && t.id !== "All" ? "All" : t.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  timeWindow === t.id
                    ? "bg-cyan-600 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(8,145,178,0.35)]"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
                title={timeWindow === t.id ? "Click to unselect" : `Filter by ${t.label}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers (shown when 'Custom Range' button is active) */}
        {timeWindow === "custom" && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] uppercase font-bold text-cyan-300">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] uppercase font-bold text-cyan-300">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* 5. Sentiment & Rating Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Sentiment Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center w-24 shrink-0">
              <span className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Sentiment:</span>
              <InfoTooltip content="Filter by classified sentiment tone. Click active sentiment to unselect." size={11} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "All", label: "All" },
                { id: "positive", label: "Positive", color: "bg-emerald-600 text-white border-emerald-400/50" },
                { id: "negative", label: "Negative", color: "bg-rose-600 text-white border-rose-400/50" },
                { id: "mixed", label: "Mixed", color: "bg-amber-600 text-white border-amber-400/50" },
                { id: "neutral", label: "Neutral", color: "bg-slate-600 text-white border-slate-400/50" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSentiment(sentiment === s.id && s.id !== "All" ? "All" : s.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    sentiment === s.id
                      ? s.color || "bg-white/20 text-white border-white/30"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
                  title={sentiment === s.id ? "Click to unselect" : `Filter by ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Star Rating Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center w-20 shrink-0">
              <span className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider">Rating:</span>
              <InfoTooltip content="Filter by exact player star rating. Click active star rating to unselect." size={11} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "All", label: "All" },
                { id: "5", label: "5★" },
                { id: "4", label: "4★" },
                { id: "3", label: "3★" },
                { id: "2", label: "2★" },
                { id: "1", label: "1★" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRating(rating === r.id && r.id !== "All" ? "All" : r.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    rating === r.id
                      ? "bg-amber-500 text-black font-bold border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
                  title={rating === r.id ? "Click to unselect" : `Filter by ${r.label}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-3xl overflow-hidden flex-1 flex flex-col border border-white/[0.08]">
        <div className="px-6 py-3.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
          <span>
            Displaying <strong className="text-white">{reviews.length}</strong> matching reviews
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] uppercase font-semibold text-slate-500">Max limit:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { val: 100, label: "100" },
                { val: 500, label: "500" },
                { val: 1000, label: "1K" },
                { val: 2500, label: "2.5K" },
                { val: 5000, label: "5,000" },
                { val: 0, label: "Unlimited" },
              ].map((lim) => (
                <button
                  key={lim.label}
                  type="button"
                  onClick={() => setReviewLimit(reviewLimit === lim.val && lim.val !== 0 ? 0 : lim.val)}
                  className={`px-2.5 py-0.5 rounded text-[0.68rem] font-mono font-semibold transition-all cursor-pointer ${
                    reviewLimit === lim.val
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
                  title={reviewLimit === lim.val ? "Active limit (click to toggle)" : `Limit to ${lim.label}`}
                >
                  {lim.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16">
            <CricketLoader
              label="Querying Review Intelligence Database..."
              subtext="Filtering reviews by sentiment, star rating, and NLP taxonomy"
              size="md"
            />
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Sparkles size={24} className="mx-auto text-slate-500" />
            <div className="text-sm font-semibold text-slate-300">No reviews matched your filters</div>
            <p className="text-xs text-slate-500">
              Try clicking &quot;Reset All&quot; or selecting a broader category like &quot;Monetization&quot;, &quot;Gameplay&quot;, or &quot;Experience&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[650px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#0b0f19] border-b border-white/[0.08] text-slate-400 z-10">
                <tr>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Game</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Rating</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Date</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Category</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Subcategory</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Sentiment</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Review Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {reviews.map((r, i) => {
                  let sentimentBadge = "bg-white/5 text-slate-400 border-white/5";
                  if (r.sentiment === "positive") sentimentBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  else if (r.sentiment === "negative") sentimentBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  else if (r.sentiment === "mixed") sentimentBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";

                  return (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                        {games[r.game]?.name || r.game}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {r.rating} <Star size={11} className="fill-amber-400" />
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[0.7rem] whitespace-nowrap">
                        {r.review_date?.substring(0, 10) || "—"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.primary_category ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                            {r.primary_category}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.subcategory ? (
                          <span className="text-slate-300 text-[0.75rem] font-medium">{r.subcategory}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.sentiment ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.7rem] border capitalize ${sentimentBadge}`}>
                            {r.sentiment}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 min-w-[340px] leading-relaxed">
                        {r.review_text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
