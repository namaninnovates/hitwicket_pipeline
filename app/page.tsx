"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Database,
  BookOpen,
  Play,
  X,
  RotateCcw,
  History,
} from "lucide-react";
import ExecutiveSummary from "./components/ExecutiveSummary";
import Overview from "./components/Overview";
import PriorityIssues from "./components/PriorityIssues";
import FounderBrief from "./components/FounderBrief";
import CompetitorBenchmark from "./components/CompetitorBenchmark";
import GameAnalytics from "./components/GameAnalytics";
import ReviewExplorer from "./components/ReviewExplorer";
import PipelineHistory from "./components/PipelineHistory";
import PipelineSidebar from "./components/PipelineSidebar";
import HistorySidebar from "./components/HistorySidebar";
import Documentation from "./components/Documentation";
import Footer from "./components/Footer";
import CricketLoader from "./components/CricketLoader";

export interface HistorySnapshot {
  id: string;
  title: string;
  timestamp: string;
  game: string;
  totalReviews: number;
  avgRating: number;
  positivePct: number;
  topPriority?: string;
  brief?: string | null;
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState<"dashboard" | "data" | "docs">("dashboard");
  const [games, setGames] = useState<Record<string, any>>({});
  const [selectedGame, setSelectedGame] = useState("all");
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<HistorySnapshot | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games || {}));

    // Check & hydrate backend database on first visit if empty
    fetch("/api/metrics").then((r) => r.json()).then((data) => {
      if (!data.overall?.ingested) {
        fetch("/api/seed").then(() => setRefreshKey((prev) => prev + 1)).catch(() => {});
      }
    });

    // Load history snapshots count
    fetch("/api/history").then((r) => r.json()).then((d) => {
      setHistoryCount(d.snapshots?.length || 0);
    });
  }, []);

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      "⚠️ Reset Your Local Telemetry Database to 0?\n\nThis will purge all locally stored reviews, classifications, competitor matrices, and founder briefs from your browser."
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await fetch("/api/database/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      }).catch(() => {});

      window.location.reload();
    } catch (e) {
      console.error("Error resetting local data:", e);
      alert("Error clearing local database.");
    } finally {
      setIsResetting(false);
    }
  };

  const handlePipelineComplete = async (payload?: any) => {
    setIsPipelineOpen(false);
    
    // 1. Instantly trigger children to show skeleton loaders and fetch fresh data from Neon
    setRefreshKey((prev) => prev + 1);
    setIsRefreshingData(true);

    try {
      // 2. Meanwhile, page.tsx silently builds the history snapshot in the background
      const [gamesRes, metricsRes, briefRes] = await Promise.all([
        fetch("/api/games").then((r) => r.json()).catch(() => ({})),
        fetch("/api/metrics").then((r) => r.json()).catch(() => ({})),
        fetch(`/api/brief?game=${selectedGame}`).then((r) => r.json()).catch(() => ({})),
      ]);
      if (gamesRes?.games) setGames(gamesRes.games);

      const activeMetrics = selectedGame === "all" ? metricsRes?.overall : metricsRes?.games?.[selectedGame];
      if (activeMetrics) {
        const newSnap: HistorySnapshot = {
          id: "snap_" + Date.now(),
          title: selectedGame === "all" ? "Global Market Synthesis" : `${gamesRes?.games?.[selectedGame]?.name || selectedGame} Analysis`,
          timestamp: new Date().toISOString(),
          game: selectedGame,
          totalReviews: activeMetrics.ingested || 0,
          avgRating: activeMetrics.avgRating || 0,
          positivePct: activeMetrics.posPct || 0,
          topPriority: activeMetrics.topPriority || undefined,
          brief: briefRes?.brief || null,
        };
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSnap)
        });
        setHistoryCount((prev) => prev + 1);
      }
    } catch (e) {
      console.warn("Snapshot auto-save on pipeline complete:", e);
    } finally {
      setTimeout(() => {
        setIsRefreshingData(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Global Navigation Bar (Mobile-Responsive Header & Touch Subnav) */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/[0.08] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Main Top Row */}
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
            {/* Left: History Button + Logo & Branding */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* ChatGPT-style History Button on Far Left */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                title="Open Intelligence History (ChatGPT-style)"
              >
                <History size={14} className="text-indigo-400" />
                <span className="hidden sm:inline">History</span>
                {historyCount > 0 && (
                  <span className="text-[0.65rem] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 font-mono">
                    {historyCount}
                  </span>
                )}
              </button>

              <div className="flex flex-col">
                <span className="font-extrabold text-sm sm:text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-200">
                  HITWICKET — Market Intelligence
                </span>
                <span className="text-[0.65rem] sm:text-xs text-slate-400 font-medium">
                  Founder’s Office Intelligence Dashboard
                </span>
              </div>
            </div>

            {/* Desktop Center Navigation Tabs (Hidden on mobile, shown in subnav) */}
            <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/[0.08] shadow-inner shrink-0">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "dashboard"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <LayoutDashboard size={13} />
                <span>Intelligence</span>
              </button>
              <button
                onClick={() => setActiveView("data")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "data"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Database size={13} />
                <span>Explorer</span>
              </button>
              <button
                onClick={() => setActiveView("docs")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeView === "docs"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <BookOpen size={13} />
                <span>Documentation</span>
              </button>
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick Game Selector (Desktop only, mobile shows below) */}
              {activeView === "dashboard" && (
                <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setSelectedGame("all")}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedGame === "all"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  {Object.keys(games).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedGame(key)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate max-w-[90px] ${
                        selectedGame === key
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {games[key]?.name?.split(" ")[0] || key}
                    </button>
                  ))}
                </div>
              )}

              {/* Reset Everything Button */}
              <button
                type="button"
                onClick={handleResetAll}
                disabled={isResetting}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Reset Database to Fresh Slate"
              >
                <RotateCcw size={13} className={isResetting ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Reset</span>
              </button>

              {/* Setup / Run Pipeline Primary Trigger */}
              <button
                type="button"
                onClick={() => setIsPipelineOpen(true)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:scale-[1.02] cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Setup Pipeline</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Row (Views + Game Switcher) */}
          <div className="flex md:hidden flex-col gap-2 py-2 border-t border-white/[0.06]">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "dashboard"
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard size={13} />
                <span>Intelligence</span>
              </button>
              <button
                onClick={() => setActiveView("data")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "data"
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Database size={13} />
                <span>Explorer</span>
              </button>
              <button
                onClick={() => setActiveView("docs")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "docs"
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen size={13} />
                <span>Docs</span>
              </button>
            </div>

            {/* Mobile Game Pills (when on Intelligence view) */}
            {activeView === "dashboard" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedGame("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    selectedGame === "all"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold"
                      : "bg-white/5 text-slate-400 border border-white/5"
                  }`}
                >
                  All (Global)
                </button>
                {Object.keys(games).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedGame(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      selectedGame === key
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold"
                        : "bg-white/5 text-slate-400 border border-white/5"
                    }`}
                  >
                    {games[key]?.name || key}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full">
        {/* Active Historical Snapshot Banner */}
        {activeSnapshot && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <History size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">
                  Viewing Historical Snapshot: <span className="text-indigo-300">{activeSnapshot.title}</span>
                </p>
                <p className="text-[0.68rem] text-slate-400">
                  Preserved from {new Date(activeSnapshot.timestamp).toLocaleString()} &bull; {activeSnapshot.totalReviews} reviews ({activeSnapshot.avgRating}★)
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSnapshot(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Exit Snapshot &amp; Return to Live
            </button>
          </div>
        )}

        {isRefreshingData ? (
          <div className="py-24 flex flex-col items-center justify-center min-h-[400px]">
            <CricketLoader
              label="Syncing Intelligence Telemetry..."
              subtext="Loading newly ingested reviews, updated priority scores, and competitor matrices"
              size="lg"
            />
          </div>
        ) : (
          <>
            {activeView === "dashboard" && (
              <div key={`dashboard-${refreshKey}`} className="space-y-8 animate-in fade-in duration-300">
                {/* 0. Executive Summary (Founder's Tagline, Snapshot Cards, What Changed, Key Findings) */}
                <section>
                  <ExecutiveSummary selectedGame={selectedGame} onViewEvidence={() => setActiveView("data")} />
                </section>

                {/* 1. Global / Game Overview Metrics */}
                <section>
                  <Overview selectedGame={selectedGame} games={games} refreshKey={refreshKey} />
                </section>

                {/* 2. 90-Second Executive Founder Brief */}
                <section>
                  <FounderBrief selectedGame={selectedGame} historicalBrief={activeSnapshot?.brief} refreshKey={refreshKey} />
                </section>

                {/* 3. Priority Issues & Competitor Benchmark Matrix */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Top Prioritized Issues */}
                  <div className="lg:col-span-7 h-full">
                    <PriorityIssues selectedGame={selectedGame} refreshKey={refreshKey} />
                  </div>

                  {/* Right Column: Benchmark Matrix & Comparison Telemetry */}
                  <div className="lg:col-span-5 space-y-8">
                    <CompetitorBenchmark refreshKey={refreshKey} />
                    <GameAnalytics refreshKey={refreshKey} />
                  </div>
                </section>
              </div>
            )}

            {activeView === "data" && (
              <div key={`data-${refreshKey}`} className="space-y-8 animate-in fade-in duration-300">
                <ReviewExplorer games={games} />
                <PipelineHistory />
              </div>
            )}

            {activeView === "docs" && (
              <div key={`docs-${refreshKey}`}>
                <Documentation />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Attribution */}
      <Footer />

      {/* ChatGPT-style History Sidebar Drawer */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        activeSnapshotId={activeSnapshot?.id || null}
        onSelectSnapshot={(snap) => {
          setActiveSnapshot(snap);
          if (snap) {
            setSelectedGame(snap.game);
          }
        }}
        onNewAnalysis={() => {
          setActiveSnapshot(null);
          setIsPipelineOpen(true);
        }}
      />

      {/* Slide-out Execution Controller Panel */}
      {isPipelineOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => {
              const closeBtn = document.getElementById("pipeline-close-trigger");
              if (closeBtn) closeBtn.click();
              else setIsPipelineOpen(false);
            }}
          />
          <div className="relative w-full sm:max-w-lg glass-panel h-full shadow-2xl border-l border-white/10 rounded-l-none sm:rounded-l-3xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <PipelineSidebar
              games={games}
              selectedGame={selectedGame}
              setSelectedGame={setSelectedGame}
              hideFilters
              onComplete={handlePipelineComplete}
              onClose={() => setIsPipelineOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
