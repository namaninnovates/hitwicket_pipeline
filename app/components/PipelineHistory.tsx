import { useState, useEffect } from "react";
import { History, CheckCircle2, XCircle, Clock, Hash, Layers } from "lucide-react";
import CricketLoader from "./CricketLoader";

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
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
          <History size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Audit Log</h2>
          <p className="text-xs text-slate-500">Historical records of all data ingestion and classification runs</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden flex-1 flex flex-col border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-12">
            <CricketLoader
              label="Loading Pipeline Audit Log..."
              subtext="Fetching historical telemetry runs from database"
              size="md"
            />
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No pipeline executions logged in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
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
              <tbody className="divide-y divide-slate-100">
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
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">#{runId}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[0.7rem] whitespace-nowrap">
                        {timestamp}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[0.7rem] text-slate-700 font-medium">
                          {stages}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">{fetched}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">{newReviews}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold">{classified}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-700 font-bold">{failures}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[0.7rem]">{model}</td>
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
