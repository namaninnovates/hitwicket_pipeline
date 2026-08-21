import { useState, useEffect, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Quote, 
  Star, 
  Search, 
  ChevronsUpDown,
  Flame,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import InfoTooltip from "./Tooltip";

export default function PriorityIssues({ 
  selectedGame, 
  refreshKey = 0 
}: { 
  selectedGame: string; 
  refreshKey?: number;
}) {
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set([0]));
  const [searchQuery, setSearchQuery] = useState("");

  const isGlobal = selectedGame === "all";

  useEffect(() => {
    const loadPriorities = async () => {
      setLoading(true);
      fetch(`/api/priorities?game=${selectedGame}`)
        .then((res) => res.json())
        .then((data) => {
          setPriorities(data.priorities || []);
          setLoading(false);
          // Default expand top 1
          setExpandedIndices(new Set([0]));
          setShowAll(false);
        })
        .catch(() => setLoading(false));
    };

    loadPriorities();
  }, [selectedGame, refreshKey]);

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIndices.size === displayedPriorities.length) {
      setExpandedIndices(new Set());
    } else {
      setExpandedIndices(new Set(displayedPriorities.map((_, idx) => idx)));
    }
  };

  const GAME_NAMES: Record<string, string> = {
    hitwicket: "Hitwicket",
    tennis_clash: "Tennis Clash",
    baseball_clash: "Baseball Clash",
  };

  // Filtered priorities based on search query
  const filteredPriorities = useMemo(() => {
    if (!searchQuery.trim()) return priorities;
    const q = searchQuery.toLowerCase().trim();
    return priorities.filter((p) => {
      const cat = (p.primary_category || "").toLowerCase();
      const sub = (p.subcategory || "").toLowerCase();
      const game = (p.game || "").toLowerCase();
      const gameName = (GAME_NAMES[p.game] || "").toLowerCase();
      return cat.includes(q) || sub.includes(q) || game.includes(q) || gameName.includes(q);
    });
  }, [priorities, searchQuery]);

  // Displayed slice: either top 5 (default) or all (when showAll is true or when searching)
  const displayedPriorities = useMemo(() => {
    if (showAll || searchQuery.trim().length > 0) {
      return filteredPriorities;
    }
    return filteredPriorities.slice(0, 5);
  }, [filteredPriorities, showAll, searchQuery]);

  const formatTrend = (trend?: string) => {
    if (!trend) return "Stable";
    const cleaned = trend.replace(/_/g, " ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mb-6" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl p-4 h-16 animate-pulse bg-slate-100 border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col h-full border-2 border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
              <span>{isGlobal ? "Global Cross-Game Priority Issues" : "Top Priority Issues"}</span>
              <InfoTooltip content="Ranked list of highest-friction player problems. In Global view, issues are ranked across all competing titles to see who has the most critical bottleneck." />
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center flex-wrap gap-1">
            <span>Algorithmic formula:</span>
            <span className="text-slate-700 font-mono font-semibold">0.30×Freq + 0.25×Sev + 0.25×Impact + 0.20×Trend</span>
            <InfoTooltip content="Priority Index Formula: Combines issue frequency (30%), severity (25%), revenue/retention impact (25%), and 30-day trajectory trend (20%)." />
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {priorities.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              title="Expand or Collapse All"
            >
              <ChevronsUpDown size={13} className="text-slate-500" />
              <span>{expandedIndices.size === displayedPriorities.length ? "Collapse All" : "Expand All"}</span>
            </button>
          )}
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
            {showAll || searchQuery ? `${displayedPriorities.length} Issues` : `Top ${Math.min(5, priorities.length)} of ${priorities.length}`}
          </span>
        </div>
      </div>

      {/* Search Input when Show All is Active or > 5 issues */}
      {(showAll || priorities.length > 5) && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter priority issues by category, subcategory, or game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Issues List */}
      {priorities.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-2xl border-dashed border-slate-200 text-slate-500 text-xs">
          No classified issues for this title. Run the intelligence pipeline to generate rankings.
        </div>
      ) : displayedPriorities.length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-xs">
          No priority issues matched &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {displayedPriorities.map((p, idx) => {
            const score = p.priority_int || 0;
            const isExpanded = expandedIndices.has(idx);
            const itemGame = p.game || (isGlobal ? "hitwicket" : selectedGame);
            const isHitwicket = itemGame === "hitwicket";

            // Tier styling
            let scoreColor = "text-emerald-800 bg-emerald-50 border-emerald-300";
            let borderColor = "hover:border-emerald-300";
            let dotColor = "bg-emerald-600";
            if (score >= 40) {
              scoreColor = "text-rose-800 bg-rose-50 border-rose-300";
              borderColor = "hover:border-rose-300";
              dotColor = "bg-rose-600 animate-pulse";
            } else if (score >= 30) {
              scoreColor = "text-amber-800 bg-amber-50 border-amber-300";
              borderColor = "hover:border-amber-300";
              dotColor = "bg-amber-600";
            }

            return (
              <div
                key={idx}
                className={`rounded-2xl transition-all duration-200 border-2 ${
                  isExpanded 
                    ? "border-indigo-300 bg-indigo-50/20 shadow-xs" 
                    : "border-slate-200 bg-white hover:bg-slate-50/70"
                } ${borderColor}`}
              >
                {/* Clickable Header Row (Compact List Item) */}
                <div
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(idx)}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 font-mono shrink-0">
                      {idx + 1}
                    </span>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      {/* In Global mode, show game badge */}
                      {isGlobal && (
                        <span
                          className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            isHitwicket
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {GAME_NAMES[itemGame] || itemGame}
                        </span>
                      )}
                      
                      <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
                        {p.primary_category}
                      </span>
                      
                      <span className="text-[0.65rem] sm:text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        {p.subcategory}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${scoreColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="whitespace-nowrap">{score} / 100</span>
                      <InfoTooltip content={`Priority Score: ${score}/100 based on formula weighting.`} size={11} />
                    </div>
                    <div className="text-slate-400 hover:text-slate-700 transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body (Only rendered when open!) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 animate-in fade-in duration-200 space-y-4">
                    {/* Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] uppercase font-medium text-slate-500">Frequency</span>
                          <InfoTooltip content="Percentage of all classified reviews that mention this specific issue." size={11} />
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{p.frequency_pct?.toFixed(1)}%</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] uppercase font-medium text-slate-500">Avg Severity</span>
                          <InfoTooltip content="Technical & gameplay disruption rating from 1.0 (trivial) to 5.0 (unplayable / crash)." size={11} />
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{p.avg_severity?.toFixed(1)} / 5.0</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] uppercase font-medium text-slate-500">Biz Impact</span>
                          <InfoTooltip content="Estimated churn and monetization risk from 1.0 (low) to 5.0 (critical revenue blocker)." size={11} />
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{p.avg_business_impact?.toFixed(1)} / 5.0</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] uppercase font-medium text-slate-500">Trend</span>
                          <InfoTooltip content="Change in review frequency over the last 30 days vs previous 30 days." size={11} />
                        </div>
                        <div className="text-sm font-bold text-indigo-700 mt-0.5 truncate">
                          {formatTrend(p.trend_label)}
                        </div>
                      </div>
                    </div>

                    {/* Authentic Review Quotes */}
                    {p.samples && p.samples.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          <Quote size={13} className="text-indigo-600" />
                          <span>Authentic User Feedback ({GAME_NAMES[itemGame] || itemGame})</span>
                          <InfoTooltip content="Raw, unedited review excerpts from players directly expressing this issue on Google Play." size={11} />
                        </div>
                        <div className="space-y-2">
                          {p.samples.map((sample: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="bg-white border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-700 shadow-2xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1 text-amber-600 font-bold">
                                  <span>{sample.rating}</span>
                                  <Star size={11} className="fill-amber-500 text-amber-500" />
                                </div>
                                <span className="text-[0.65rem] text-slate-400 font-mono">{sample.date}</span>
                              </div>
                              <p className="italic text-slate-800">&ldquo;{sample.text}&rdquo;</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Expand / Collapse Full List Button */}
      {priorities.length > 5 && !searchQuery && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer hover:scale-[1.01]"
          >
            {showAll ? (
              <>
                <ChevronUp size={14} className="text-slate-600" />
                <span>Show Top 5 Priority Issues Only</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} className="text-indigo-600" />
                <span>Show All {priorities.length} Issues ({priorities.length - 5} More)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
