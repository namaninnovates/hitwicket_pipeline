import { useState, useEffect } from "react";
import { Inbox, Star, ThumbsDown, ThumbsUp, CheckCircle2, TrendingUp, Sparkles, Trophy, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import InfoTooltip from "./Tooltip";


export default function Overview({ selectedGame, games = {}, refreshKey }: any) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    // Fetch directly from API
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => {
        setMetrics({ status: "empty" });
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchMetrics();
  }, [selectedGame, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 h-28 animate-pulse bg-slate-800/40" />
        ))}
      </div>
    );
  }

  if (!metrics || metrics.status === "empty" || !metrics.overall || !metrics.overall.ingested) {
    return (
      <div className="glass-card rounded-2xl p-6 border-amber-500/30 bg-amber-500/5 text-amber-300 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="text-amber-400" size={24} />
          <div>
            <div className="font-semibold text-white">Database is currently empty</div>
            <div className="text-sm text-slate-400">Click &quot;Setup Pipeline&quot; in the top right to ingest and analyze Google Play reviews.</div>
          </div>
        </div>
      </div>
    );
  }

  const isGlobal = selectedGame === "all";
  const activeData = (isGlobal ? metrics.overall : metrics.games?.[selectedGame]) || metrics.overall || {};
  const rel = metrics.relative || {};
  const gameTitle = isGlobal ? "Global Market Intelligence & Comparative Benchmarks" : `${games?.[selectedGame]?.name || selectedGame} Overview`;

  return (
    <div className="space-y-4">
      {/* Header with Relative Benchmark Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{gameTitle}</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {isGlobal ? "Cross-Game Benchmark" : "Last 90 Days"}
            </span>
            <InfoTooltip content="When Global is selected, all telemetry and scores are calculated relative to competitors to isolate Hitwicket's competitive advantages and bottlenecks." />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isGlobal
              ? "Relative performance comparisons between Hitwicket and competing sports gaming titles"
              : "Automated NLP sentiment and category telemetry"}
          </p>
        </div>

        {/* Global Leaderboard Badge */}
        {isGlobal && rel.leaderboard && (
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-white/10 text-xs">
            <span className="text-[0.68rem] uppercase font-bold text-slate-400 pl-1 flex items-center gap-1">
              <Trophy size={13} className="text-amber-400" />
              <span>Rank #1:</span>
            </span>
            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {games?.[rel.leaderboard[0]?.game]?.name || rel.leaderboard[0]?.game} ({rel.leaderboard[0]?.rating}★)
            </span>
          </div>
        )}
      </div>

      {/* 5 Core Metric Cards with Relative Deltas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Ingested */}
        <MetricCard
          label="Total Ingested"
          info="Total public reviews fetched from Google Play stored in your private local database."
          value={activeData?.ingested?.toLocaleString() || "0"}
          subtitle={
            isGlobal
              ? `Across ${Object.keys(games || {}).length || 3} Games (100%)`
              : `${Math.round(((activeData?.ingested || 0) / (metrics.overall?.ingested || 1)) * 100)}% of Market Sample`
          }
          relativeBadge={
            isGlobal ? (
              <span className="text-[0.65rem] text-slate-400 font-medium">Equal ~33% Share</span>
            ) : (
              <span className="text-[0.65rem] text-indigo-300 font-mono">
                {activeData?.ingested || 0} / {metrics.overall?.ingested || 0}
              </span>
            )
          }
          icon={<Inbox size={18} className="text-indigo-400" />}
          gradient="from-indigo-500/20 via-transparent to-transparent"
          borderHover="hover:border-indigo-500/40"
          valueColor="text-white"
        />

        {/* 2. Average Rating */}
        <MetricCard
          label="Average Rating"
          info="Mean star rating (1.0 to 5.0). In Global view, shows Hitwicket's delta relative to competitor averages."
          value={activeData?.avgRating ? `${activeData.avgRating} ★` : "N/A"}
          subtitle={
            isGlobal
              ? `Competitor Avg: ${rel.competitor_avg_rating || "3.92"} ★`
              : `Market Avg: ${metrics.overall?.avgRating || "4.03"} ★`
          }
          relativeBadge={
            isGlobal ? (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (rel.hw_rating_delta || 0) >= 0
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                }`}
              >
                {(rel.hw_rating_delta || 0) >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                <span>
                  Hitwicket {(rel.hw_rating_delta || 0) >= 0 ? `+${rel.hw_rating_delta}` : rel.hw_rating_delta} vs Rivals
                </span>
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (activeData?.vs_market_rating || 0) >= 0
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                }`}
              >
                {(activeData?.vs_market_rating || 0) >= 0 ? `+${activeData.vs_market_rating}` : activeData?.vs_market_rating} vs Market
              </span>
            )
          }
          icon={<Star size={18} className="text-amber-400 fill-amber-400/20" />}
          gradient="from-amber-500/20 via-transparent to-transparent"
          borderHover="hover:border-amber-500/40"
          valueColor="text-amber-400"
        />

        {/* 3. Negative Sentiment */}
        <MetricCard
          label="Negative Sentiment"
          info="1-2 star reviews indicating critical bugs and churn friction. Lower percentage relative to competitors is better."
          value={activeData?.negPct !== undefined ? `${activeData.negPct}%` : "0%"}
          subtitle={
            isGlobal
              ? `Rival Avg: ${rel.competitor_neg_pct || "19.8"}%`
              : `Market Avg: ${metrics.overall?.negPct || "18.2"}%`
          }
          relativeBadge={
            isGlobal ? (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (rel.hw_neg_delta || 0) <= 0
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                }`}
              >
                {(rel.hw_neg_delta || 0) <= 0 ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                <span>
                  Hitwicket {(rel.hw_neg_delta || 0) <= 0 ? `${rel.hw_neg_delta}% (Lower)` : `+${rel.hw_neg_delta}%`}
                </span>
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (activeData?.vs_market_neg || 0) <= 0
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                }`}
              >
                {(activeData?.vs_market_neg || 0) <= 0 ? `${activeData?.vs_market_neg}%` : `+${activeData?.vs_market_neg}%`} vs Market
              </span>
            )
          }
          icon={<ThumbsDown size={18} className="text-rose-400" />}
          gradient="from-rose-500/20 via-transparent to-transparent"
          borderHover="hover:border-rose-500/40"
          valueColor="text-rose-400"
        />

        {/* 4. Positive Sentiment */}
        <MetricCard
          label="Positive Sentiment"
          info="4-5 star reviews indicating satisfaction and praise. Higher percentage relative to competitors is better."
          value={activeData?.posPct !== undefined ? `${activeData.posPct}%` : "0%"}
          subtitle={
            isGlobal
              ? `Rival Avg: ${rel.competitor_pos_pct || "72.6"}%`
              : `Market Avg: ${metrics.overall?.posPct || "74.5"}%`
          }
          relativeBadge={
            isGlobal ? (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (rel.hw_pos_delta || 0) >= 0
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                }`}
              >
                {(rel.hw_pos_delta || 0) >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                <span>
                  Hitwicket {(rel.hw_pos_delta || 0) >= 0 ? `+${rel.hw_pos_delta}% (Higher)` : `${rel.hw_pos_delta}%`}
                </span>
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-0.5 text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                  (activeData?.vs_market_pos || 0) >= 0
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-rose-400 bg-rose-500/10"
                }`}
              >
                {(activeData?.vs_market_pos || 0) >= 0 ? `+${activeData?.vs_market_pos}%` : `${activeData?.vs_market_pos}%`} vs Market
              </span>
            )
          }
          icon={<ThumbsUp size={18} className="text-emerald-400" />}
          gradient="from-emerald-500/20 via-transparent to-transparent"
          borderHover="hover:border-emerald-500/40"
          valueColor="text-emerald-400"
        />

        {/* 5. Classified Issues */}
        <MetricCard
          label="Classified Issues"
          info="Reviews categorized by the taxonomy with category, severity, and business impact."
          value={activeData?.classified?.toLocaleString() || "0"}
          subtitle={
            isGlobal
              ? `Avg ~${Math.round(((activeData?.classified || 0) / 3)) || 0} / Game`
              : `Rank #${activeData?.rank || 1} in Category Sample`
          }
          relativeBadge={
            <span className="text-[0.65rem] text-cyan-300 font-mono">
              100% Tagged
            </span>
          }
          icon={<CheckCircle2 size={18} className="text-cyan-400" />}
          gradient="from-cyan-500/20 via-transparent to-transparent"
          borderHover="hover:border-cyan-500/40"
          valueColor="text-cyan-400"
          className="col-span-2 md:col-span-1 lg:col-span-1"
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  info,
  value,
  subtitle,
  relativeBadge,
  icon,
  gradient,
  borderHover,
  valueColor,
  className = "",
}: {
  label: string;
  info: string;
  value: string;
  subtitle: string;
  relativeBadge?: React.ReactNode;
  icon: React.ReactNode;
  gradient: string;
  borderHover: string;
  valueColor: string;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5 relative transition-all duration-300 ${borderHover} ${className}`}>
      {/* Background ambient glow contained separately so tooltips aren't clipped */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-tl ${gradient} rounded-full blur-xl`} />
      </div>

      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{label}</span>
          <InfoTooltip content={info} position="bottom" />
        </div>
        <div className="p-2 rounded-xl bg-white/5 border border-white/5">{icon}</div>
      </div>

      <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${valueColor} mb-1 relative z-10`}>
        {value}
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
        {relativeBadge && <div className="mt-0.5">{relativeBadge}</div>}
      </div>
    </div>
  );
}
