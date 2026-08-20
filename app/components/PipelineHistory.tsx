import { useState, useEffect } from "react";
import { History, CheckCircle2, XCircle, Clock, Hash, Layers } from "lucide-react";

export default function PipelineHistory() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data.runs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <History size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Pipeline Audit Log</h2>
          <p className="text-xs text-slate-400">Historical records of all data ingestion and classification runs</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden flex-1 flex flex-col border border-white/[0.08]">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
            <span className="text-xs">Loading execution history...</span>
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No pipeline executions logged in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400">
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Run ID</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Stages</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Fetched</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">New Added</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Classified</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Failures</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {runs.map((r, i) => {
                  const runId = String(r.id ?? r.run_id ?? i + 1);
                  const timestamp = r.run_at || r.timestamp || "—";
                  const stages = r.stages_run || r.stages || "all";
                  const fetched = r.reviews_fetched ?? r.fetched ?? "—";
                  const newReviews = r.new_reviews ?? r.new ?? "—";
                  const classified = r.classified ?? "—";
                  const failures = r.classification_failures ?? r.failures ?? 0;
                  const model = r.model_used ?? "gemini-2.5-flash";

                  return (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">#{runId}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[0.7rem] whitespace-nowrap">
                        {timestamp}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[0.7rem] text-slate-300 font-medium">
                          {stages}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">{fetched}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{newReviews}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">{classified}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-400">{failures}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[0.7rem]">{model}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
