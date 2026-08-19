import { useState, useEffect } from "react";

export default function GameAnalytics() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(data => {
        setAnalytics(data.analytics || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-slate-400">Loading analytics...</div>;
  if (analytics.length < 2) return <div className="text-amber-400">Need data from multiple games to show comparison. Please run the pipeline for all games.</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Game vs Game Analytics</h2>
        <p className="text-sm text-slate-400 mb-2">
          Compare ratings, sentiment, and review volume across Hitwicket and its competitors.
        </p>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Key Metrics Overview</h3>
      <div className="bg-[#101524] border border-[#28334e] rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#161d31] border-b border-[#28334e] text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Game Name</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Review Volume</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Avg Rating</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Positive (4-5★) %</th>
              <th className="px-6 py-4 font-semibold">Negative (1-2★) %</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a, i) => (
              <tr key={i} className="border-b border-[#1e293b] last:border-0 hover:bg-[#131828] transition-colors">
                <td className="px-6 py-4 font-medium text-white border-r border-[#1e293b]">{a.name}</td>
                <td className="px-6 py-4 text-slate-300 border-r border-[#1e293b]">{a.volume.toLocaleString()}</td>
                <td className="px-6 py-4 text-indigo-400 font-bold border-r border-[#1e293b]">{a.avgRating} ★</td>
                <td className="px-6 py-4 text-emerald-400 border-r border-[#1e293b]">{a.posPct}%</td>
                <td className="px-6 py-4 text-red-400">{a.negPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-bold text-white mb-4">Sentiment Breakdown (%)</h3>
      <div className="bg-[#101524] border border-[#28334e] rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#161d31] border-b border-[#28334e] text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Game Name</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Positive</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Negative</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Mixed</th>
              <th className="px-6 py-4 font-semibold">Neutral</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a, i) => (
              <tr key={i} className="border-b border-[#1e293b] last:border-0 hover:bg-[#131828] transition-colors">
                <td className="px-6 py-4 font-medium text-white border-r border-[#1e293b]">{a.name}</td>
                <td className="px-6 py-4 text-emerald-400 border-r border-[#1e293b]">{a.sentiment.positive}%</td>
                <td className="px-6 py-4 text-red-400 border-r border-[#1e293b]">{a.sentiment.negative}%</td>
                <td className="px-6 py-4 text-amber-400 border-r border-[#1e293b]">{a.sentiment.mixed}%</td>
                <td className="px-6 py-4 text-slate-400">{a.sentiment.neutral}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
