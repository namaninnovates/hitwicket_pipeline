import { useState, useEffect } from "react";
import { BarChart3, Star, Percent } from "lucide-react";
import InfoTooltip from "./Tooltip";

export default function GameAnalytics({ refreshKey = 0 }: { refreshKey?: number }) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data.analytics || []);
        setLoading(false);
      });
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-4">
        <div className="h-6 w-48 bg-slate-800/60 rounded animate-pulse" />
        <div className="h-32 bg-slate-800/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (analytics.length < 2) return null;

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
            <span>Game vs Game Telemetry</span>
            <InfoTooltip content="Comparative volume, mean store rating, and sentiment ratio bars across competing titles." />
          </h2>
          <p className="text-xs text-slate-400">Head-to-head rating &amp; sentiment breakdown</p>
        </div>
      </div>

      <div className="space-y-4">
        {analytics.map((game, idx) => {
          const isHitwicket = game.name?.toLowerCase().includes("hitwicket");
          return (
            <div
              key={idx}
              className={`glass-card rounded-2xl p-4 border transition-all ${
                isHitwicket ? "border-indigo-500/30 bg-indigo-500/[0.04]" : "border-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{game.name}</span>
                  {isHitwicket && (
                    <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      Our Game
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 font-mono">{game.volume?.toLocaleString()} reviews</span>
                  <div className="flex items-center gap-1 font-bold text-amber-400">
                    <span>{game.avgRating}</span>
                    <Star size={12} className="fill-amber-400" />
                  </div>
                </div>
              </div>

              {/* Sentiment Ratio Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[0.68rem] text-slate-400">
                  <span className="text-emerald-400 font-semibold flex items-center">
                    {game.posPct}% Positive
                    <InfoTooltip content="4-5 star reviews indicating satisfaction." size={10} />
                  </span>
                  <span className="text-rose-400 font-semibold flex items-center">
                    {game.negPct}% Negative
                    <InfoTooltip content="1-2 star reviews indicating frustration." size={10} />
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden flex border border-white/5">
                  <div
                    style={{ width: `${game.posPct || 0}%` }}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full"
                    title={`Positive: ${game.posPct}%`}
                  />
                  <div
                    style={{ width: `${Math.max(0, 100 - (game.posPct || 0) - (game.negPct || 0))}%` }}
                    className="bg-amber-400/40 h-full"
                    title="Mixed / Neutral"
                  />
                  <div
                    style={{ width: `${game.negPct || 0}%` }}
                    className="bg-gradient-to-r from-rose-500 to-rose-400 h-full"
                    title={`Negative: ${game.negPct}%`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
