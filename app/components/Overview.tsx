import { useState, useEffect } from "react";

export default function Overview({ selectedGame, games }: any) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-slate-400">Loading overview...</div>;
  if (!metrics || metrics.status === "empty") return <div className="text-amber-400">Database is empty. Run the pipeline to fetch data!</div>;

  const renderRow = (title: string, data: any) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="90d Ingested" value={data.ingested?.toLocaleString() || 0} color="text-indigo-400" />
        <MetricCard label="Avg Rating" value={`${data.avgRating || 0} ★`} color="text-indigo-400" />
        <MetricCard label="Negative (1-2★)" value={`${data.negPct || 0}%`} color="text-red-400" />
        <MetricCard label="Positive (4-5★)" value={`${data.posPct || 0}%`} color="text-emerald-400" />
        <MetricCard label="Classified" value={data.classified?.toLocaleString() || 0} color="text-amber-400" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">
          Review Intelligence — {selectedGame === "all" ? "All Titles" : games[selectedGame]?.name}
        </h2>
        <p className="text-slate-400 text-sm">Google Play Public Reviews • Last 90 Days</p>
      </div>

      {selectedGame === "all" ? (
        <>
          {renderRow("Overall (All Games)", metrics.overall)}
          {Object.keys(games).map(key => (
            metrics.games[key] && renderRow(games[key].name, metrics.games[key])
          ))}
        </>
      ) : (
        renderRow(games[selectedGame]?.name, metrics.games[selectedGame] || {})
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="metric-card">
      <div className="text-[0.7rem] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
