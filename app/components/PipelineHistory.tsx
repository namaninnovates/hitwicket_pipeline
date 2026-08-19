import { useState, useEffect } from "react";

export default function PipelineHistory() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then(res => res.json())
      .then(data => {
        setRuns(data.runs || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-slate-400">Loading pipeline history...</div>;
  if (runs.length === 0) return <div className="text-amber-400">No execution runs recorded yet.</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Pipeline Execution Audit Log</h2>
        <p className="text-sm text-slate-400 mb-2">Record of all pipeline runs, including how many reviews were fetched and classified.</p>
      </div>

      <div className="bg-[#101524] border border-[#28334e] rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#161d31] border-b border-[#28334e] text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Run ID</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Timestamp (UTC)</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Stages</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Fetched</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">New Added</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Classified</th>
              <th className="px-6 py-4 font-semibold border-r border-[#28334e]">Failures</th>
              <th className="px-6 py-4 font-semibold">Model</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => (
              <tr key={i} className="border-b border-[#1e293b] last:border-0 hover:bg-[#131828] transition-colors">
                <td className="px-6 py-4 font-medium text-white border-r border-[#1e293b]">{r.id}</td>
                <td className="px-6 py-4 text-slate-300 border-r border-[#1e293b]">{r.run_at}</td>
                <td className="px-6 py-4 text-indigo-400 border-r border-[#1e293b]">{r.stages_run}</td>
                <td className="px-6 py-4 text-slate-300 border-r border-[#1e293b]">{r.reviews_fetched}</td>
                <td className="px-6 py-4 text-emerald-400 font-bold border-r border-[#1e293b]">{r.new_reviews}</td>
                <td className="px-6 py-4 text-amber-400 font-bold border-r border-[#1e293b]">{r.classified}</td>
                <td className="px-6 py-4 text-red-400 border-r border-[#1e293b]">{r.classification_failures}</td>
                <td className="px-6 py-4 text-slate-300">{r.model_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
