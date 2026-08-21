import { useState, useEffect } from "react";
import { Swords, AlertCircle, Compass, CheckCircle } from "lucide-react";
import InfoTooltip from "./Tooltip";


export default function CompetitorBenchmark({ refreshKey = 0 }: { refreshKey?: number }) {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatrix = async () => {
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
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Swords size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center">
              <span>Competitor Benchmark Matrix</span>
              <InfoTooltip content="Cross-game category volume comparison. Highlights which categories are high friction across competitors vs specific to Hitwicket." />
            </h2>
            <p className="text-xs text-slate-500">Category volume distribution vs category leaders</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Category</th>
                {games.map((g) => (
                  <th key={g.id} className="py-3.5 px-4 font-semibold uppercase tracking-wider">
                    <span className={g.isPrimary ? "text-indigo-700 font-bold flex items-center gap-1.5" : "text-slate-600"}>
                      {g.name}
                      {g.isPrimary && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">{cat}</td>
                  {games.map((g) => {
                    const val = matrixData[cat]?.[g.id];
                    let badge = "text-slate-600 bg-slate-100 border-slate-200";
                    if (val === "High") {
                      badge = "text-rose-800 bg-rose-50 border-rose-200 font-bold";
                    } else if (val === "Medium") {
                      badge = "text-amber-800 bg-amber-50 border-amber-200 font-medium";
                    } else if (val === "Low") {
                      badge = "text-emerald-800 bg-emerald-50 border-emerald-200 font-medium";
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
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          <Compass size={14} className="text-indigo-600" />
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
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-indigo-50 border-indigo-200 text-indigo-900"
                  }`}
                >
                  {isSpecific ? (
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle size={16} className="text-indigo-600 shrink-0 mt-0.5" />
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
          <div className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">
            All 3 games exhibit symmetric category distribution profiles.
          </div>
        )}
      </div>
    </div>
  );
}
