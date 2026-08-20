"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Database,
  BookOpen,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import Overview from "./components/Overview";
import PriorityIssues from "./components/PriorityIssues";
import FounderBrief from "./components/FounderBrief";
import CompetitorBenchmark from "./components/CompetitorBenchmark";
import GameAnalytics from "./components/GameAnalytics";
import ReviewExplorer from "./components/ReviewExplorer";
import PipelineHistory from "./components/PipelineHistory";
import PipelineSidebar from "./components/PipelineSidebar";
import Documentation from "./components/Documentation";

export default function Dashboard() {
  const [activeView, setActiveView] = useState<"dashboard" | "data" | "docs">("dashboard");
  const [games, setGames] = useState<Record<string, any>>({});
  const [selectedGame, setSelectedGame] = useState("all");
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games || {}));
  }, []);

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      "⚠️ Reset All Telemetry Data to 0?\n\nThis will purge all ingested reviews, classifications, competitor matrices, and founder briefs from the system."
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const res = await fetch("/api/database/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to reset database.");
      }
    } catch (e) {
      console.error("Error resetting data:", e);
      alert("Error communicating with reset endpoint.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* Top Floating Glass Navbar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Main View Tabs */}
          <div className="flex items-center gap-5 lg:gap-7 shrink-0">
            {/* Brand Logo & Tag */}
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 font-extrabold text-base">
                  Hitwicket
                </span>
                <span className="text-[0.6rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
                  Intel
                </span>
              </span>
            </div>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06]">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeView === "dashboard"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <LayoutDashboard size={13} />
                <span>Executive Intel</span>
              </button>
              <button
                onClick={() => setActiveView("data")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeView === "data"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Database size={13} />
                <span>Data Explorer</span>
              </button>
              <button
                onClick={() => setActiveView("docs")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeView === "docs"
                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <BookOpen size={13} />
                <span>Documentation</span>
              </button>
            </nav>
          </div>

          {/* Right: Game Switcher & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Game Selector Segmented Buttons (Only on dashboard view) */}
            {activeView === "dashboard" && (
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedGame("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedGame === "all"
                      ? "bg-white/15 text-white shadow-sm border border-white/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  Global
                </button>
                {Object.entries(games).map(([key, g]: any) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedGame(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedGame === key
                        ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)] border border-indigo-400/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Reset Everything Button */}
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all shadow-sm hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              title="Reset all database records and review intelligence metrics to 0"
            >
              <RotateCcw size={12} className={isResetting ? "animate-spin text-rose-400" : "text-rose-400"} />
              <span>{isResetting ? "Resetting..." : "Reset"}</span>
            </button>

            {/* Setup Pipeline CTA */}
            <button
              onClick={() => setIsPipelineOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-400 hover:to-fuchsia-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Setup Pipeline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeView === "dashboard" && (
          <div className="space-y-8">
            {/* 1. Global / Game Overview Metrics */}
            <section>
              <Overview selectedGame={selectedGame} games={games} />
            </section>

            {/* 2. 90-Second Executive Founder Brief (First thing below stats) */}
            <section>
              <FounderBrief selectedGame={selectedGame} />
            </section>

            {/* 3. Priority Issues & Competitor Benchmark Matrix */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Top Prioritized Issues */}
              <div className="lg:col-span-7 h-full">
                <PriorityIssues selectedGame={selectedGame} />
              </div>

              {/* Right Column: Benchmark Matrix & Comparison Telemetry */}
              <div className="lg:col-span-5 space-y-8">
                <CompetitorBenchmark />
                <GameAnalytics />
              </div>
            </section>
          </div>
        )}

        {activeView === "data" && (
          <div className="space-y-8">
            <ReviewExplorer games={games} />
            <PipelineHistory />
          </div>
        )}

        {activeView === "docs" && (
          <div>
            <Documentation />
          </div>
        )}
      </main>

      {/* Slide-out Execution Controller Panel */}
      {isPipelineOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPipelineOpen(false)}
          />
          <div className="relative w-full max-w-lg glass-panel h-full shadow-2xl border-l border-white/10 rounded-l-3xl overflow-hidden flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <button
              onClick={() => setIsPipelineOpen(false)}
              className="absolute top-5 right-5 z-20 text-slate-400 hover:text-white bg-black/60 p-2 rounded-full border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
            <PipelineSidebar
              games={games}
              selectedGame={selectedGame}
              setSelectedGame={setSelectedGame}
              hideFilters
            />
          </div>
        </div>
      )}
    </div>
  );
}
