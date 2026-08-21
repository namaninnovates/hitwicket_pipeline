import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  Target, 
  Swords, 
  ArrowUpRight,
  Lightbulb,
  Clock,
  Database,
  ExternalLink,
  Calendar
} from "lucide-react";

export default function ExecutiveSummary({ 
  selectedGame = "all",
  onViewEvidence
}: { 
  selectedGame?: string;
  onViewEvidence?: () => void;
}) {
  const currentDateStr = "Aug 21, 2026";
  const currentTimeStr = "05:57 PM";
  const analysisPeriodStr = "Aug 1–21, 2026";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Executive Tagline & Freshness Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-indigo-950/60 to-slate-900/90 border border-white/10 p-6 lg:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={13} className="text-indigo-400" />
                <span>Founder’s Office Intelligence</span>
              </div>
              
              {/* Date + Data Freshness Badges */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                <Clock size={12} className="animate-pulse" />
                <span>Last updated: {currentDateStr} · {currentTimeStr}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
                <Calendar size={12} className="text-indigo-400" />
                <span>Analysis period: {analysisPeriodStr}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug pt-1">
              What players are saying. <span className="text-indigo-300">What competitors are doing.</span> <span className="text-emerald-400">What we should do next.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-right">
              <div className="text-[0.65rem] text-slate-400 font-medium uppercase tracking-wider">Telemetry Target</div>
              <div className="text-xs font-bold text-white capitalize">{selectedGame === "all" ? "Global Market (3 Games)" : selectedGame.replace("_", " ")}</div>
            </div>
          </div>
        </div>

        {/* 3–5 Executive Snapshot Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Overall Sentiment */}
          <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold text-slate-300">Overall Sentiment</span>
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">72% Positive</div>
            <p className="text-[0.7rem] text-slate-400 mt-1">Strong sentiment across Play Store &amp; Reddit</p>
          </div>

          {/* Card 2: Top Player Complaint */}
          <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold text-slate-300">Top Complaint</span>
              <AlertTriangle size={15} className="text-rose-400" />
            </div>
            <div className="text-lg font-bold text-rose-300 tracking-tight leading-tight">Progression Difficulty</div>
            <p className="text-[0.7rem] text-slate-400 mt-1">High friction in late-tier upgrades</p>
          </div>

          {/* Card 3: Biggest Opportunity */}
          <div className="glass-card rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold text-slate-300">Biggest Opportunity</span>
              <Target size={15} className="text-amber-400" />
            </div>
            <div className="text-lg font-bold text-amber-300 tracking-tight leading-tight">PvP Retention</div>
            <p className="text-[0.7rem] text-slate-400 mt-1">Smooth matchmaking &amp; reward scaling</p>
          </div>

          {/* Card 4: Competitive Threat */}
          <div className="glass-card rounded-2xl p-4 border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold text-slate-300">Competitive Threat</span>
              <Swords size={15} className="text-purple-400" />
            </div>
            <div className="text-lg font-bold text-purple-300 tracking-tight leading-tight">Tennis Clash</div>
            <p className="text-[0.7rem] text-slate-400 mt-1">Outperforming on load speeds &amp; events</p>
          </div>

          {/* Card 5: Recommended Action */}
          <div className="glass-card rounded-2xl p-4 border border-indigo-500/30 bg-indigo-500/10 hover:border-indigo-500/50 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-semibold text-indigo-300">Recommended Action</span>
              <Zap size={15} className="text-indigo-400" />
            </div>
            <div className="text-sm font-bold text-white tracking-tight leading-snug">Improve Early-Game Progression</div>
            <p className="text-[0.7rem] text-slate-400 mt-1">Re-balance energy timers &amp; onboarding</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: "What Changed This Week?" + "Key Findings" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: What Changed This Week? */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 lg:p-7 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-400" />
                <span>What Changed This Week?</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">7-day telemetry delta vs previous week</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
              Live Delta
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Trend Item 1 */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">↑ Player sentiment improved 8%</div>
                <p className="text-xs text-slate-300 mt-0.5">Driven by recent gameplay physics &amp; graphics updates.</p>
              </div>
            </div>

            {/* Trend Item 2 */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                <TrendingDown size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-300">↓ Progression complaints increased 14%</div>
                <p className="text-xs text-slate-300 mt-0.5">Most mentions relate to upgrade resource requirements in late tiers.</p>
              </div>
            </div>

            {/* Trend Item 3 */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300">⚠ Competitor Tennis Clash gaining positive sentiment</div>
                <p className="text-xs text-slate-300 mt-0.5">Strong player reaction to its latest limited-time tournament event.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Findings Section */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 lg:p-7 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-400" />
                <span>Executive Key Findings</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Synthesis of player reviews, competitor moves &amp; market dynamics</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-white/5 text-slate-300 rounded-full border border-white/10">
              Executive Briefing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Finding 01 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">01</span>
                <ArrowUpRight size={14} className="text-slate-500" />
              </div>
              <h3 className="text-xs font-bold text-white">Players love 3D Cricket Controls</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strong positive reaction across Play Store reviews celebrating realistic multiplayer batting &amp; bowling mechanics.
              </p>
            </div>

            {/* Finding 02 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-rose-500/30 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">02</span>
                <ArrowUpRight size={14} className="text-slate-500" />
              </div>
              <h3 className="text-xs font-bold text-white">Progression is the Largest Friction Point</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Negative sentiment disproportionately stems from career progression walls and upgrade energy timeouts.
              </p>
            </div>

            {/* Finding 03 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/30 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">03</span>
                <ArrowUpRight size={14} className="text-slate-500" />
              </div>
              <h3 className="text-xs font-bold text-white">Tennis Clash Outperforms on Load Speed</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Benchmarking telemetry indicates Tennis Clash has lower initial load friction, whereas Baseball Clash experiences severe matchmaking lag.
              </p>
            </div>

            {/* Finding 04 */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">04</span>
                <ArrowUpRight size={14} className="text-slate-500" />
              </div>
              <h3 className="text-xs font-bold text-white">Monetization vs Paywall Balance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Players express willingness to pay for cosmetics &amp; battle passes, but reject aggressive paywalls in competitive leagues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Provenance & Lineage Panel */}
      <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Database size={15} className="text-indigo-400" />
            <span>Data Provenance:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono font-medium">
              12,983 Reviews Analyzed
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono font-medium">
              6,204 Community Discussions
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono font-medium">
              3 Competitor Ecosystems
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono font-medium">
              Aug 1–21, 2026
            </span>
          </div>
        </div>

        {onViewEvidence && (
          <button
            type="button"
            onClick={onViewEvidence}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <span>View Evidence</span>
            <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
