import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Flame, TrendingUp, ShieldAlert, Quote, Star, Gamepad2 } from "lucide-react";
import InfoTooltip from "./Tooltip";
import { getLocalTelemetry } from "../lib/localDb";

export default function PriorityIssues({ selectedGame, refreshKey = 0 }: { selectedGame: string; refreshKey?: number }) {
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    const loadPriorities = async () => {
      // 1. Try local telemetry database first
      try {
        const local = await getLocalTelemetry();
        if (local?.priorities) {
          let list: any[] = [];
          if (selectedGame === "all") {
            Object.values(local.priorities).forEach((arr: any) => {
              if (Array.isArray(arr)) list.push(...arr);
            });
            list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
          } else if (local.priorities[selectedGame]) {
            list = local.priorities[selectedGame];
          }
          if (list.length > 0) {
            setPriorities(list);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // 2. Fallback to API
      setLoading(true);
      fetch(`/api/priorities?game=${selectedGame}`)
        .then((res) => res.json())
        .then((data) => {
          setPriorities(data.priorities || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadPriorities();
  }, [selectedGame, refreshKey]);

  const isGlobal = selectedGame === "all";

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-4">
        <div className="h-6 w-48 bg-slate-800/60 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-800/40 rounded animate-pulse mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 h-32 animate-pulse bg-slate-800/40" />
        ))}
      </div>
    );
  }

  const GAME_NAMES: Record<string, string> = {
    hitwicket: "Hitwicket",
    tennis_clash: "Tennis Clash",
    baseball_clash: "Baseball Clash",
  };

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert size={18} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
              <span>{isGlobal ? "Global Cross-Game Priority Issues" : "Top Priority Issues"}</span>
              <InfoTooltip content="Ranked list of highest-friction player problems. In Global view, issues are ranked across all competing titles to see who has the most critical bottleneck." />
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            <span>Algorithmic formula:</span>
            <span className="text-slate-300 font-mono ml-1">0.30×Freq + 0.25×Sev + 0.25×Impact + 0.20×Trend</span>
            <InfoTooltip content="Priority Index Formula: Combines issue frequency (30%), severity (25%), revenue/retention impact (25%), and 30-day trajectory trend (20%)." />
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
          {priorities.length} Tracked
        </span>
      </div>

      {priorities.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-2xl border-dashed border-white/10 text-slate-400">
          No classified issues for this title. Run the intelligence pipeline to generate rankings.
        </div>
      ) : (
        <div className="space-y-3.5 flex-1">
          {priorities.map((p, idx) => {
            const score = p.priority_int || 0;
            const isExpanded = expandedIndex === idx;
            const itemGame = p.game || (isGlobal ? "hitwicket" : selectedGame);
            const isHitwicket = itemGame === "hitwicket";

            // Tier styling
            let scoreColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
            let borderColor = "hover:border-emerald-500/30";
            let dotColor = "bg-emerald-400";
            if (score >= 40) {
              scoreColor = "text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]";
              borderColor = "hover:border-rose-500/40";
              dotColor = "bg-rose-400 animate-pulse";
            } else if (score >= 30) {
              scoreColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
              borderColor = "hover:border-amber-500/40";
              dotColor = "bg-amber-400";
            }

            return (
              <div
                key={idx}
                className={`glass-card rounded-2xl p-5 transition-all duration-200 border ${
                  isExpanded ? "border-indigo-500/40 bg-white/[0.05]" : "border-white/[0.07]"
                } ${borderColor}`}
              >
                {/* Header Row */}
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300 font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* In Global mode, show game badge */}
                        {isGlobal && (
                          <span
                            className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md border ${
                              isHitwicket
                                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                                : "bg-white/5 text-slate-400 border-white/10"
                            }`}
                          >
                            {GAME_NAMES[itemGame] || itemGame}
                          </span>
                        )}
                        <span className="text-base font-bold text-white tracking-tight">
                          {p.primary_category}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                          {p.subcategory}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${scoreColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span>{score} / 100</span>
                      <InfoTooltip content={`Priority Score: ${score}/100 based on formula weighting.`} size={11} />
                    </div>
                    <div className="text-slate-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/5">
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] uppercase font-medium text-slate-400">Frequency</span>
                      <InfoTooltip content="Percentage of all classified reviews that mention this specific issue." size={11} />
                    </div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{p.frequency_pct?.toFixed(1)}%</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] uppercase font-medium text-slate-400">Avg Severity</span>
                      <InfoTooltip content="Technical & gameplay disruption rating from 1.0 (trivial) to 5.0 (unplayable / crash)." size={11} />
                    </div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{p.avg_severity?.toFixed(1)} / 5.0</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] uppercase font-medium text-slate-400">Biz Impact</span>
                      <InfoTooltip content="Estimated churn and monetization risk from 1.0 (low) to 5.0 (critical revenue blocker)." size={11} />
                    </div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{p.avg_business_impact?.toFixed(1)} / 5.0</div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.68rem] uppercase font-medium text-slate-400">Trend</span>
                      <InfoTooltip content="Change in review frequency over the last 30 days vs previous 30 days." size={11} />
                    </div>
                    <div className="text-sm font-bold text-indigo-300 mt-0.5 truncate">{p.trend_label || "Stable"}</div>
                  </div>
                </div>

                {/* Expandable Authentic Review Quotes */}
                {isExpanded && p.samples && p.samples.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      <Quote size={13} className="text-indigo-400" />
                      <span>Authentic User Feedback ({GAME_NAMES[itemGame] || itemGame})</span>
                      <InfoTooltip content="Raw, unedited review excerpts from players directly expressing this issue on Google Play." size={11} />
                    </div>
                    <div className="space-y-2">
                      {p.samples.map((sample: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 text-xs leading-relaxed text-slate-300"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                              <span>{sample.rating}</span>
                              <Star size={12} className="fill-amber-400" />
                            </div>
                            <span className="text-[0.65rem] text-slate-400 font-mono">{sample.date}</span>
                          </div>
                          <p className="italic text-slate-200">&ldquo;{sample.text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
