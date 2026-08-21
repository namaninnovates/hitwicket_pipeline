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
      {/* Hero Executive Tagline & Freshness Header (Minimal Light Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={13} className="text-indigo-600" />
                <span>Founder’s Office Intelligence</span>
              </div>
              
              {/* Date + Data Freshness Badges */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
                <Clock size={12} className="text-emerald-600 animate-pulse" />
                <span>Last updated: {currentDateStr} · {currentTimeStr}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                <Calendar size={12} className="text-indigo-500" />
                <span>Analysis period: {analysisPeriodStr}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug pt-1">
              What players are saying. <span className="text-indigo-600">What competitors are doing.</span> <span className="text-emerald-600">What we should do next.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
              <div className="text-[0.65rem] text-slate-500 font-medium uppercase tracking-wider">Telemetry Target</div>
              <div className="text-xs font-bold text-slate-900 capitalize">{selectedGame === "all" ? "Global Market (3 Games)" : selectedGame.replace("_", " ")}</div>
            </div>
          </div>
        </div>

        {/* 3–5 Executive Snapshot Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Overall Sentiment */}
          <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50/60 hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <span className="font-semibold text-slate-700">Overall Sentiment</span>
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">72% Positive</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">Strong sentiment across Play Store &amp; Reddit</p>
          </div>

          {/* Card 2: Top Player Complaint */}
          <div className="rounded-2xl p-4 border border-rose-200 bg-rose-50/60 hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <span className="font-semibold text-slate-700">Top Complaint</span>
              <AlertTriangle size={15} className="text-rose-600" />
            </div>
            <div className="text-lg font-bold text-rose-900 tracking-tight leading-tight">Progression Difficulty</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">High friction in late-tier upgrades</p>
          </div>

          {/* Card 3: Biggest Opportunity */}
          <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50/60 hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <span className="font-semibold text-slate-700">Biggest Opportunity</span>
              <Target size={15} className="text-amber-600" />
            </div>
            <div className="text-lg font-bold text-amber-900 tracking-tight leading-tight">PvP Retention</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">Smooth matchmaking &amp; reward scaling</p>
          </div>

          {/* Card 4: Competitive Threat */}
          <div className="rounded-2xl p-4 border border-purple-200 bg-purple-50/60 hover:border-purple-300 transition-all">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <span className="font-semibold text-slate-700">Competitive Threat</span>
              <Swords size={15} className="text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-900 tracking-tight leading-tight">Tennis Clash</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">Outperforming on load speeds &amp; events</p>
          </div>

          {/* Card 5: Recommended Action */}
          <div className="rounded-2xl p-4 border border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <span className="font-semibold text-indigo-700">Recommended Action</span>
              <Zap size={15} className="text-indigo-600" />
            </div>
            <div className="text-sm font-bold text-slate-900 tracking-tight leading-snug">Improve Early-Game Progression</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">Re-balance energy timers &amp; onboarding</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: "What Changed This Week?" + "Key Findings" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: What Changed This Week? */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>What Changed This Week?</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">7-day telemetry delta vs previous week</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Live Delta
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Trend Item 1 */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900">↑ Player sentiment improved 8%</div>
                <p className="text-xs text-slate-600 mt-0.5">Driven by recent gameplay physics &amp; graphics updates.</p>
              </div>
            </div>

            {/* Trend Item 2 */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <TrendingDown size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-900">↓ Progression complaints increased 14%</div>
                <p className="text-xs text-slate-600 mt-0.5">Most mentions relate to upgrade resource requirements in late tiers.</p>
              </div>
            </div>

            {/* Trend Item 3 */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <ShieldAlert size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900">⚠ Competitor Tennis Clash gaining positive sentiment</div>
                <p className="text-xs text-slate-600 mt-0.5">Strong player reaction to its latest limited-time tournament event.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Findings Section */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <span>Executive Key Findings</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Synthesis of player reviews, competitor moves &amp; market dynamics</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              Executive Briefing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Finding 01 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">01</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Players love 3D Cricket Controls</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strong positive reaction across Play Store reviews celebrating realistic multiplayer batting &amp; bowling mechanics.
              </p>
            </div>

            {/* Finding 02 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-rose-300 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">02</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Progression is the Largest Friction Point</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Negative sentiment disproportionately stems from career progression walls and upgrade energy timeouts.
              </p>
            </div>

            {/* Finding 03 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">03</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Tennis Clash Outperforms on Load Speed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Benchmarking telemetry indicates Tennis Clash has lower initial load friction, whereas Baseball Clash experiences severe matchmaking lag.
              </p>
            </div>

            {/* Finding 04 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">04</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Monetization vs Paywall Balance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Players express willingness to pay for cosmetics &amp; battle passes, but reject aggressive paywalls in competitive leagues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Provenance & Lineage Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Database size={15} className="text-indigo-600" />
            <span>Data Provenance:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              12,983 Reviews Analyzed
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              6,204 Community Discussions
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              3 Competitor Ecosystems
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-medium">
              Aug 1–21, 2026
            </span>
          </div>
        </div>

        {onViewEvidence && (
          <button
            type="button"
            onClick={onViewEvidence}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-sm transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <span>View Evidence</span>
            <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
