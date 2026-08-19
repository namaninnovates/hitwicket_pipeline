import { useState, useEffect } from "react";

export default function CompetitorBenchmark() {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matrix")
      .then(res => res.json())
      .then(data => {
        setMatrixData(data.matrix || {});
        setInsights(data.insights || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-slate-400">Loading competitor benchmark...</div>;
  if (!matrixData || Object.keys(matrixData).length === 0) return <div className="text-amber-400">Not enough data to build benchmark matrix.</div>;

  const categories = Object.keys(matrixData);
  const games = ["hitwicket", "tennis_clash", "baseball_clash"]; // we know the structure

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Cross-Game Benchmark Matrix</h2>
        <p className="text-sm text-slate-400 mb-2">
          Category volume distribution comparing Hitwicket against Tennis Clash and Baseball Clash:
        </p>
      </div>

      <div className="bg-[#101524] border border-[#28334e] rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#161d31] border-b border-[#28334e] text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Category</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Hitwicket</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Tennis Clash</th>
              <th className="px-6 py-4 font-semibold">Baseball Clash</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => (
              <tr key={i} className="border-b border-[#1e293b] last:border-0 hover:bg-[#131828] transition-colors">
                <td className="px-6 py-4 font-medium text-slate-300 border-r border-[#1e293b]">{cat}</td>
                {games.map((g, j) => {
                  const val = matrixData[cat]?.[g];
                  let badge = "text-slate-500";
                  if (val === "High") badge = "bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-md font-medium";
                  else if (val === "Medium") badge = "bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-md font-medium";
                  else if (val === "Low") badge = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-md font-medium";
                  
                  return (
                    <td key={j} className="px-6 py-4 border-r border-[#1e293b] last:border-0">
                      <span className={badge}>{val || "-"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Strategic Insights</h3>
      {insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((item, i) => {
            const isSpecific = item.specificity === "hitwicket_specific";
            return (
              <div key={i} className={`p-4 rounded-lg border ${isSpecific ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
                {isSpecific ? (
                  <><strong>Hitwicket-Specific Problem:</strong> `{item.primary_category}` is High for Hitwicket, but Low/Medium for rivals. High priority for differentiation.</>
                ) : (
                  <><strong>Industry-Wide Problem:</strong> `{item.primary_category}` is a shared category pain point across Hitwicket and its competitors.</>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-slate-400">All 3 games show similar category distribution profiles.</div>
      )}
    </div>
  );
}
