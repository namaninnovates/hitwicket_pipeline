"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Database,
  BookOpen,
  Play,
  RotateCcw,
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
import Documentation from "./components/Documentation";
import Footer from "./components/Footer";
import CricketLoader from "./components/CricketLoader";

export default function Dashboard() {
  const [activeView, setActiveView] = useState<"dashboard" | "data" | "docs">("dashboard");
  const [games, setGames] = useState<Record<string, any>>({});
  const [selectedGame, setSelectedGame] = useState("all");
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
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
    
    // Trigger children to show skeleton loaders and fetch fresh data from Neon
    setRefreshKey((prev) => prev + 1);
    setIsRefreshingData(true);

    try {
      const gamesRes = await fetch("/api/games").then((r) => r.json()).catch(() => ({}));
      if (gamesRes?.games) setGames(gamesRes.games);
    } catch (e) {
      console.warn("Pipeline complete refresh error:", e);
    } finally {
      setTimeout(() => {
        setIsRefreshingData(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20">
      {/* Top Global Navigation Bar (Solid Indigo Executive Header) */}
      <header className="sticky top-0 z-40 bg-indigo-950 border-b border-indigo-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Main Top Row */}
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
            {/* Left: Logo & Branding + Fixed Desktop Navigation Tabs */}
            <div className="flex items-center gap-4 lg:gap-8 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    HITWICKET — Market Intelligence
                  </span>
                  <span className="text-[0.65rem] sm:text-xs text-indigo-200 font-medium">
                    Founder’s Office Intelligence Dashboard
                  </span>
                </div>
              </div>

              {/* Desktop Navigation Tabs (Permanently Fixed in Position) */}
              <nav className="hidden md:flex items-center gap-1 bg-indigo-900/80 p-1 rounded-2xl border border-indigo-800/80 shrink-0">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeView === "dashboard"
                      ? "bg-indigo-600 text-white shadow-xs border border-indigo-500 font-bold"
                      : "text-indigo-200 hover:text-white hover:bg-indigo-800/60"
                  }`}
                >
                  <LayoutDashboard size={13} />
                  <span>Intelligence</span>
                </button>
                <button
                  onClick={() => setActiveView("data")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeView === "data"
                      ? "bg-indigo-600 text-white shadow-xs border border-indigo-500 font-bold"
                      : "text-indigo-200 hover:text-white hover:bg-indigo-800/60"
                  }`}
                >
                  <Database size={13} />
                  <span>Explorer</span>
                </button>
                <button
                  onClick={() => setActiveView("docs")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeView === "docs"
                      ? "bg-indigo-600 text-white shadow-xs border border-indigo-500 font-bold"
                      : "text-indigo-200 hover:text-white hover:bg-indigo-800/60"
                  }`}
                >
                  <BookOpen size={13} />
                  <span>Documentation</span>
                </button>
              </nav>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick Game Selector (Desktop only, mobile shows below) */}
              {activeView === "dashboard" && (
                <div className="hidden lg:flex items-center gap-1 bg-indigo-900/80 p-1 rounded-xl border border-indigo-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedGame("all")}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedGame === "all"
                        ? "bg-white text-indigo-950 shadow-xs border border-white font-bold"
                        : "text-indigo-200 hover:text-white"
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
                          ? "bg-white text-indigo-950 shadow-xs border border-white font-bold"
                          : "text-indigo-200 hover:text-white"
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
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Reset Database to Fresh Slate"
              >
                <RotateCcw size={13} className={isResetting ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Reset</span>
              </button>

              {/* Setup / Run Pipeline Primary Trigger */}
              <button
                type="button"
                onClick={() => setIsPipelineOpen(true)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.02] cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Setup Pipeline</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Row (Views + Game Switcher) */}
          <div className="flex md:hidden flex-col gap-2 py-2 border-t border-indigo-900">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between gap-1 bg-indigo-900/80 p-1 rounded-xl border border-indigo-800/80">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "dashboard"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-indigo-200 hover:text-white"
                }`}
              >
                <LayoutDashboard size={13} />
                <span>Intelligence</span>
              </button>
              <button
                onClick={() => setActiveView("data")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "data"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-indigo-200 hover:text-white"
                }`}
              >
                <Database size={13} />
                <span>Explorer</span>
              </button>
              <button
                onClick={() => setActiveView("docs")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === "docs"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-indigo-200 hover:text-white"
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
                      ? "bg-white text-indigo-950 border border-white font-bold"
                      : "bg-indigo-900/60 text-indigo-200 border border-indigo-800"
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
                        ? "bg-white text-indigo-950 border border-white font-bold"
                        : "bg-indigo-900/60 text-indigo-200 border border-indigo-800"
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
                  <FounderBrief selectedGame={selectedGame} refreshKey={refreshKey} />
                </section>

                {/* 3. Priority Issues & Competitor Benchmark Matrix */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Top Prioritized Issues */}
                  <div className="lg:col-span-7">
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

      {/* Footer Attribution (Solid Indigo Footer) */}
      <Footer />

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
          <div className="relative w-full sm:max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 rounded-l-none sm:rounded-l-3xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-right duration-300">
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
