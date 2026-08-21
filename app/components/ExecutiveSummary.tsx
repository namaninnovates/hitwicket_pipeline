"use client";

import React, { useState, useEffect } from "react";
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
import InfoTooltip from "./Tooltip";

export default function ExecutiveSummary({ 
  selectedGame = "all",
  refreshKey = 0,
  onViewEvidence
}: { 
  selectedGame?: string;
  refreshKey?: number;
  onViewEvidence?: () => void;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const nonce = Date.now();
        const [metricsRes, prioritiesRes, analyticsRes] = await Promise.all([
          fetch(`/api/metrics?t=${nonce}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
          fetch(`/api/priorities?game=${selectedGame}&t=${nonce}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
          fetch(`/api/analytics?t=${nonce}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        ]);

        if (metricsRes) {
          const active = selectedGame === "all" ? metricsRes.overall : metricsRes.games?.[selectedGame];
          setMetrics({
            ...(active || metricsRes.overall || {}),
            period: metricsRes.period || null,
          });
        }
        setPriorities(prioritiesRes.priorities || []);
        setAnalytics(analyticsRes.analytics || []);
      } catch (e) {
        console.warn("Could not load executive summary telemetry:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedGame, refreshKey]);

  // Derived Dynamic Telemetry
  const totalReviews = metrics?.ingested || 0;
  const posPct = metrics?.posPct !== undefined ? `${metrics.posPct}%` : "0%";
  const negPct = metrics?.negPct !== undefined ? `${metrics.negPct}%` : "0%";
  
  // Top issue from formula ranking
  const topIssue = priorities[0] || null;
  const topComplaint = topIssue 
    ? `${topIssue.primary_category}: ${topIssue.subcategory}` 
    : "No Critical Issues";
  const topComplaintSub = topIssue 
    ? `${topIssue.frequency_pct?.toFixed(1)}% mentions · Severity ${topIssue.avg_severity?.toFixed(1)}/5.0`
    : "No negative review clusters in this period";

  // Second / Opportunity issue (e.g., matchmaking / retention / monetization)
  const opportunityIssue = priorities.find((p) => p.subcategory?.toLowerCase().includes("retention") || p.subcategory?.toLowerCase().includes("matchmaking") || p.primary_category?.toLowerCase().includes("competition")) || priorities[1];
  const opportunityTitle = opportunityIssue 
    ? `${opportunityIssue.subcategory || opportunityIssue.primary_category} Tuning`
    : "Ecosystem Stability";
  const opportunitySub = opportunityIssue
    ? `Score ${opportunityIssue.priority_int}/100 · Impact ${opportunityIssue.avg_business_impact?.toFixed(1)}/5.0`
    : "Balanced gameplay metrics";

  // Top Competitor Threat
  const competitorGames = analytics.filter((a) => !a.name?.toLowerCase().includes("hitwicket"));
  const topCompetitor = competitorGames.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))[0];
  const competitorName = topCompetitor?.name || "Market Competitors";
  const competitorSub = topCompetitor 
    ? `${topCompetitor.avgRating}★ rating across ${topCompetitor.volume?.toLocaleString()} reviews`
    : "Comparative review data";

  // Recommended Action
  const recommendedAction = topIssue 
    ? `Resolve ${topIssue.subcategory || topIssue.primary_category} friction`
    : "Maintain Release Quality";
  const recommendedSub = topIssue
    ? `Address ${topIssue.frequency_pct?.toFixed(1)}% of total complaints to boost 30-day retention`
    : "Continue monitoring incoming reviews";

  // 1. Calculate Fastest Rising Issue Delta
  const risingIssues = [...priorities]
    .map((p) => {
      const curr = p.current_count ?? 0;
      const prev = p.prior_count ?? 0;
      const delta = curr - prev;
      const deltaPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      return { ...p, curr, prev, delta, deltaPct };
    })
    .sort((a, b) => {
      if (a.prev > 0 && b.prev > 0) return b.deltaPct - a.deltaPct;
      if (a.prev > 0) return -1;
      if (b.prev > 0) return 1;
      return b.curr - a.curr;
    });

  const topRising = risingIssues[0] || null;
  let topRisingTitle = "No Active Friction Spikes";
  let topRisingSub = "Player complaint volume remained stable across recent updates.";
  if (topRising) {
    if (topRising.prev > 0 && topRising.deltaPct > 0) {
      topRisingTitle = `Surging Complaints: ${topRising.subcategory || topRising.primary_category} (+${topRising.deltaPct}%)`;
      topRisingSub = `Increased from ${topRising.prev} to ${topRising.curr} mentions in the last 30 days.`;
    } else if (topRising.curr > 0) {
      topRisingTitle = `Emerging Complaint: ${topRising.subcategory || topRising.primary_category} (${topRising.curr} mentions)`;
      topRisingSub = `${topRising.curr} mentions recorded in recent 30-day window (${topRising.frequency_pct || 0}% of complaints).`;
    }
  }

  // 2. Calculate Resolving / Improving Issue Delta
  const resolvingIssues = [...priorities]
    .map((p) => {
      const curr = p.current_count ?? 0;
      const prev = p.prior_count ?? 0;
      const delta = prev - curr;
      const deltaPct = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0;
      return { ...p, curr, prev, delta, deltaPct };
    })
    .sort((a, b) => {
      if (a.prev > 0 && b.prev > 0) return b.deltaPct - a.deltaPct;
      if (a.prev > 0) return -1;
      if (b.prev > 0) return 1;
      return a.curr - b.curr;
    });

  const topResolving = resolvingIssues[0] || null;
  let topResolvingTitle = "Stable Baseline";
  let topResolvingSub = "No resolving issue transitions detected in this period.";
  if (topResolving) {
    if (topResolving.prev > 0 && topResolving.deltaPct > 0) {
      topResolvingTitle = `Resolving Friction: ${topResolving.subcategory || topResolving.primary_category} (-${topResolving.deltaPct}%)`;
      topResolvingSub = `Dropped from ${topResolving.prev} down to ${topResolving.curr} mentions post-update.`;
    } else if (topResolving.curr > 0) {
      topResolvingTitle = `Low Friction Area: ${topResolving.subcategory || topResolving.primary_category} (${topResolving.curr} mentions)`;
      topResolvingSub = `Only ${topResolving.curr} isolated mention(s) with minimal player disruption.`;
    }
  }

  // 3. Cohort Velocity Shift (Total current 30d reviews vs prior 30d)
  const totalCurrentCount = priorities.reduce((acc, p) => acc + (p.current_count ?? 0), 0);
  const totalPriorCount = priorities.reduce((acc, p) => acc + (p.prior_count ?? 0), 0);
  let velocityTitle = `${totalCurrentCount.toLocaleString()} Issues in 30-Day Cohort`;
  let velocitySub = `All ${totalCurrentCount.toLocaleString()} classified reviews reflect recent 30-day player feedback (0 in prior baseline).`;

  if (totalPriorCount > 0) {
    const overallVelocityPct = Math.round(((totalCurrentCount - totalPriorCount) / totalPriorCount) * 100);
    const velocitySign = overallVelocityPct >= 0 ? "+" : "";
    velocityTitle = `${velocitySign}${overallVelocityPct}% Review Intake Velocity Shift`;
    velocitySub = `Recorded ${totalCurrentCount.toLocaleString()} classified issues in last 30d vs ${totalPriorCount.toLocaleString()} in prior window.`;
  }

  const now = new Date();
  const currentDateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const currentTimeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const analysisPeriodStr = metrics?.period?.label || (metrics?.days ? `Last ${metrics.days} Days Telemetry` : "Last 90 Days Telemetry");

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header & 5 Snapshot Cards Skeleton */}
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex gap-2">
                <div className="h-6 w-40 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-6 w-48 bg-slate-100 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-2/3 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-12 w-36 bg-slate-100 rounded-2xl animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl p-4 h-28 animate-pulse bg-slate-50 border-2 border-slate-200 space-y-2.5">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-6 w-28 bg-slate-300 rounded-lg" />
                <div className="h-2.5 w-32 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 lg:p-7 border-2 border-slate-200 shadow-sm space-y-4">
            <div className="h-6 w-44 bg-slate-200 rounded-lg animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-50 border-2 border-slate-200 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border-2 border-slate-200 shadow-sm space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-50 border-2 border-slate-200 animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Provenance Skeleton */}
        <div className="h-16 rounded-2xl bg-white border-2 border-slate-200 shadow-sm animate-pulse" />
      </div>
    );
  }

  if (!loading && (!metrics || !totalReviews || totalReviews === 0)) {
    return (
      <div className="rounded-3xl bg-white border-2 border-amber-200 p-6 lg:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                Database Empty
              </span>
              <span className="text-xs font-mono text-slate-500">0 Reviews Ingested</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              No review intelligence found for this selection
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Click the <strong className="text-indigo-600">&quot;Setup Pipeline&quot;</strong> button in the top right to ingest public Google Play reviews, classify them along the taxonomy, and calculate priority scores.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Executive Tagline & Freshness Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-slate-200 p-6 lg:p-8 shadow-sm">
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
                <span>Last computed: {currentDateStr} · {currentTimeStr}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
                <Calendar size={12} className="text-indigo-500" />
                <span>Period: {analysisPeriodStr}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug pt-1">
              What players are saying. <span className="text-indigo-600">What competitors are doing.</span> <span className="text-emerald-600">What we should do next.</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-right">
              <div className="text-[0.65rem] text-slate-500 font-medium uppercase tracking-wider">Telemetry Target</div>
              <div className="text-xs font-bold text-slate-900 capitalize">{selectedGame === "all" ? "Global Market (3 Titles)" : selectedGame.replace("_", " ")}</div>
            </div>
          </div>
        </div>

        {/* 3–5 Executive Snapshot Cards (Computed from Real Telemetry) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Overall Sentiment */}
          <div className="rounded-2xl p-4 border-2 border-emerald-300 bg-emerald-50/70 hover:border-emerald-400 transition-all shadow-xs">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <div className="flex items-center">
                <span className="font-semibold text-slate-700">Overall Sentiment</span>
                <InfoTooltip content="Aggregated ratio of 4★/5★ positive reviews vs 1★/2★ negative reviews across ingested Google Play Store reviews." />
              </div>
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">{posPct} Positive</div>
            <p className="text-[0.7rem] text-slate-600 mt-1">Based on {totalReviews.toLocaleString()} store reviews</p>
          </div>

          {/* Card 2: Top Player Complaint */}
          <div className="rounded-2xl p-4 border-2 border-rose-300 bg-rose-50/70 hover:border-rose-400 transition-all shadow-xs">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <div className="flex items-center">
                <span className="font-semibold text-slate-700">Top Complaint</span>
                <InfoTooltip content="Rank #1 issue computed by our 4-factor formula (Frequency × 0.30 + Severity × 0.25 + Impact × 0.25 + Trend × 0.20)." />
              </div>
              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            </div>
            <div className="text-sm font-bold text-rose-900 tracking-tight leading-tight truncate">{topComplaint}</div>
            <p className="text-[0.7rem] text-slate-600 mt-1 truncate">{topComplaintSub}</p>
          </div>

          {/* Card 3: Biggest Opportunity */}
          <div className="rounded-2xl p-4 border-2 border-amber-300 bg-amber-50/70 hover:border-amber-400 transition-all shadow-xs">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <div className="flex items-center">
                <span className="font-semibold text-slate-700">Priority Tuning</span>
                <InfoTooltip content="High-impact gameplay or economy category where resolving friction unlocks outsized player retention." />
              </div>
              <Target size={15} className="text-amber-600 shrink-0" />
            </div>
            <div className="text-sm font-bold text-amber-900 tracking-tight leading-tight truncate">{opportunityTitle}</div>
            <p className="text-[0.7rem] text-slate-600 mt-1 truncate">{opportunitySub}</p>
          </div>

          {/* Card 4: Competitive Threat */}
          <div className="rounded-2xl p-4 border-2 border-purple-300 bg-purple-50/70 hover:border-purple-400 transition-all shadow-xs">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <div className="flex items-center">
                <span className="font-semibold text-slate-700">Rival Leader</span>
                <InfoTooltip content="Leading competitor in this review cohort benchmarked on store rating and review sentiment velocity." />
              </div>
              <Swords size={15} className="text-purple-600 shrink-0" />
            </div>
            <div className="text-sm font-bold text-purple-900 tracking-tight leading-tight truncate">{competitorName}</div>
            <p className="text-[0.7rem] text-slate-600 mt-1 truncate">{competitorSub}</p>
          </div>

          {/* Card 5: Recommended Action */}
          <div className="rounded-2xl p-4 border-2 border-indigo-300 bg-indigo-50/70 hover:border-indigo-400 transition-all shadow-xs col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-600 text-xs mb-2">
              <div className="flex items-center">
                <span className="font-semibold text-indigo-700">Recommended Action</span>
                <InfoTooltip content="Algorithmic action item based on highest severity bottlenecks to improve product roadmap metrics." />
              </div>
              <Zap size={15} className="text-indigo-600 shrink-0" />
            </div>
            <div className="text-xs font-bold text-slate-900 tracking-tight leading-snug truncate">{recommendedAction}</div>
            <p className="text-[0.7rem] text-slate-600 mt-1 truncate">{recommendedSub}</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: "What Changed This Week?" + "Key Findings" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: What Changed This Week? */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 lg:p-7 border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>What Changed This Period?</span>
                <InfoTooltip content="Trailing 30-day review volume and velocity trajectories comparing current frequency against baseline." />
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">30-day velocity trajectory and volume shift</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Live Database
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Trend Item 1: Surging Issue (Escalating Delta) */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5 border border-rose-200">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-900">
                  {topRisingTitle}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {topRisingSub}
                </p>
              </div>
            </div>

            {/* Trend Item 2: Resolving Problem (Falling Delta) */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5 border border-emerald-200">
                <TrendingDown size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900">
                  {topResolvingTitle}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {topResolvingSub}
                </p>
              </div>
            </div>

            {/* Trend Item 3: Overall 30-Day Cohort Velocity */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5 border border-indigo-200">
                <Zap size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-900">
                  ⚡ {velocityTitle}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {velocitySub}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Findings Section */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border-2 border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <span>Executive Key Findings</span>
                <InfoTooltip content="Key decision takeaways synthesized from classified review taxonomy and priority scoring calculations." />
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Synthesis of classified review metrics and priority calculations</p>
            </div>
            <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              Live Algorithmic Rankings
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Finding 01 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-indigo-200 hover:border-indigo-400 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">01</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Sentiment Distribution: {posPct} Positive</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aggregated sentiment scoring reveals {posPct} positive vs {negPct} negative reviews across {totalReviews.toLocaleString()} verified player records.
              </p>
            </div>

            {/* Finding 02 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-rose-200 hover:border-rose-400 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">02</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Rank #1 Issue: {topIssue ? `${topIssue.primary_category} (${topIssue.subcategory})` : "General Feedback"}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {topIssue 
                  ? `Calculated Priority Score of ${topIssue.priority_int}/100 driven by severity (${topIssue.avg_severity?.toFixed(1)}★) and business impact (${topIssue.avg_business_impact?.toFixed(1)}★).`
                  : "No critical player friction bottlenecks identified in the current review batch."}
              </p>
            </div>

            {/* Finding 03 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-purple-200 hover:border-purple-400 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">03</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Competitive Benchmark: 3 Titles</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Comparing Hitwicket vs Tennis Clash &amp; Baseball Clash across volume, rating deltas, and category friction distributions.
              </p>
            </div>

            {/* Finding 04 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-amber-200 hover:border-amber-400 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">04</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Actionable Feedback: {priorities.length} Issues</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {priorities.length} distinct problem categories tracked with concrete review evidence, frequency ratios, and risk tiers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Provenance & Lineage Panel */}
      <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Database size={15} className="text-indigo-600" />
            <span>Data Provenance:</span>
            <InfoTooltip content="Audit lineage verifying review sample counts, taxonomy clusters, and Google Play Store store ingestion." />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              {totalReviews.toLocaleString()} Reviews Analyzed
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              {priorities.length} Priority Clusters
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
              {analytics.length || 3} Competing Games
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-medium">
              Google Play Telemetry
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
