import { useState, useEffect } from "react";
import { Swords, AlertCircle, Compass, CheckCircle } from "lucide-react";
import InfoTooltip from "./Tooltip";
import { telemetryCache } from "../lib/telemetryCache";

export default function CompetitorBenchmark({ refreshKey = 0 }: { refreshKey?: number }) {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatrix = async () => {
      if (telemetryCache.matrix && Object.keys(telemetryCache.matrix).length > 0) {
        setMatrixData(telemetryCache.matrix.matrix || telemetryCache.matrix);
        setLoading(false);
        return;
      }
      // Fetch directly from API
      setLoading(true);
      fetch("/api/matrix")
        .then((res) => res.json())
        .then((data) => {
          setMatrixData(data.matrix || {});
          setInsights(data.insights || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadMatrix();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-4">
        <div className="h-6 w-48 bg-slate-800/60 rounded animate-pulse" />
        <div className="h-40 bg-slate-800/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!matrixData || Object.keys(matrixData).length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-6 lg:p-8 text-center text-slate-400">
        Benchmark data unavailable. Run the full pipeline to generate competitive telemetry.
      </div>
    );
  }

  const categories = Object.keys(matrixData);
  const games = [
    { id: "hitwicket", name: "Hitwicket", isPrimary: true },
    { id: "tennis_clash", name: "Tennis Clash", isPrimary: false },
    { id: "baseball_clash", name: "Baseball Clash", isPrimary: false },
  ];

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Swords size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
              <span>Competitor Benchmark Matrix</span>
              <InfoTooltip content="Cross-game category volume comparison. Highlights which categories are high friction across competitors vs specific to Hitwicket." />
            </h2>
            <p className="text-xs text-slate-400">Category volume distribution vs category leaders</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.08] mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Category</th>
                {games.map((g) => (
                  <th key={g.id} className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                    <span className={g.isPrimary ? "text-indigo-300 font-bold flex items-center gap-1.5" : "text-slate-400"}>
                      {g.name}
                      {g.isPrimary && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {categories.map((cat, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-200">{cat}</td>
                  {games.map((g) => {
                    const val = matrixData[cat]?.[g.id];
                    let badge = "text-slate-500 bg-white/5 border-white/5";
                    if (val === "High") {
                      badge = "text-rose-400 bg-rose-500/10 border-rose-500/20 font-bold";
                    } else if (val === "Medium") {
                      badge = "text-amber-400 bg-amber-500/10 border-amber-500/20 font-medium";
                    } else if (val === "Low") {
                      badge = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-medium";
                    }

                    return (
                      <td key={g.id} className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] border ${badge}`}>
                          {val || "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Insights */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          <Compass size={14} className="text-indigo-400" />
          <span>Strategic Decision Signals</span>
          <InfoTooltip content="Derived strategic opportunities: differentiates unique Hitwicket friction points from general mobile gaming industry baselines." />
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2.5">
            {insights.map((item, i) => {
              const isSpecific = item.specificity === "hitwicket_specific";
              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    isSpecific
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-200"
                      : "bg-indigo-500/5 border-indigo-500/20 text-indigo-200"
                  }`}
                >
                  {isSpecific ? (
                    <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold mr-1">
                      {isSpecific ? "Hitwicket-Specific Bottleneck:" : "Genre-Wide Market Factor:"}
                    </span>
                    <span>
                      {isSpecific
                        ? `"${item.primary_category}" is elevated for Hitwicket but low among rivals. Priority opportunity to differentiate.`
                        : `"${item.primary_category}" is an industry-wide challenge shared across competitive titles.`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 p-3 rounded-xl bg-black/20 border border-white/5">
            All 3 games exhibit symmetric category distribution profiles.
          </div>
        )}
      </div>
    </div>
  );
}
