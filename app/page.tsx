"use client";

import { useState, useEffect } from "react";
import { BarChart2, Activity, FileText, Target, Crosshair, Search, History } from "lucide-react";
import Overview from "./components/Overview";
import PriorityIssues from "./components/PriorityIssues";
import FounderBrief from "./components/FounderBrief";
import CompetitorBenchmark from "./components/CompetitorBenchmark";
import GameAnalytics from "./components/GameAnalytics";
import ReviewExplorer from "./components/ReviewExplorer";
import PipelineHistory from "./components/PipelineHistory";
import PipelineSidebar from "./components/PipelineSidebar";

const TABS = [
  { id: "overview", name: "Overview", icon: BarChart2 },
  { id: "priority", name: "Priority Issues", icon: Activity },
  { id: "brief", name: "90-Second Founder Brief", icon: FileText },
  { id: "benchmark", name: "Competitor Benchmark", icon: Target },
  { id: "analytics", name: "Game vs Game Analytics", icon: Crosshair },
  { id: "explorer", name: "Review Explorer", icon: Search },
  { id: "history", name: "Pipeline Run History", icon: History },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [games, setGames] = useState<Record<string, any>>({});
  const [selectedGame, setSelectedGame] = useState("all");
  
  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games || {}));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f19]">
      <PipelineSidebar games={games} selectedGame={selectedGame} setSelectedGame={setSelectedGame} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#101524] border-b border-[#28334e] p-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-[#141b2d] text-slate-400 border border-[#232d4b] hover:bg-[#1e293b]"
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === "overview" && <Overview selectedGame={selectedGame} games={games} />}
            {activeTab === "priority" && <PriorityIssues selectedGame={selectedGame} />}
            {activeTab === "brief" && <FounderBrief />}
            {activeTab === "benchmark" && <CompetitorBenchmark />}
            {activeTab === "analytics" && <GameAnalytics />}
            {activeTab === "explorer" && <ReviewExplorer games={games} />}
            {activeTab === "history" && <PipelineHistory />}
          </div>
        </main>
      </div>
    </div>
  );
}
