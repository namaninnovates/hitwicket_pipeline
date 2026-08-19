import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function PriorityIssues({ selectedGame }: { selectedGame: string }) {
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const game = selectedGame === "all" ? "hitwicket" : selectedGame;
    fetch(`/api/priorities?game=${game}`)
      .then(res => res.json())
      .then(data => {
        setPriorities(data.priorities || []);
        setLoading(false);
      });
  }, [selectedGame]);

  if (loading) return <div className="text-slate-400">Loading priority issues...</div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Prioritized Issues (Formula-Derived)</h2>
        <p className="text-sm text-slate-400 mb-2">
          Ranked by explicit Priority Formula: Priority = 0.30 × Frequency + 0.25 × Severity + 0.25 × Business Impact + 0.20 × Trend
        </p>
        {selectedGame === "all" && (
          <div className="bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg text-sm inline-block">
            Displaying priority scores for Hitwicket. Select another game in the sidebar to view its ranking.
          </div>
        )}
      </div>

      {priorities.length === 0 ? (
        <div className="text-amber-400">No classified reviews available for this game yet. Run the classification stage.</div>
      ) : (
        <div className="space-y-4">
          {priorities.map((p, idx) => {
            const score = p.priority_int;
            let badgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500";
            if (score >= 45) badgeClass = "bg-red-500/20 text-red-400 border-red-500";
            else if (score >= 30) badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500";

            const isExpanded = expandedIndex === idx;

            return (
              <div key={idx} className="bg-[#131828] border border-[#232d4b] rounded-xl p-5 hover:border-[#384469] transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg m-0 text-white font-bold">
                    #{idx + 1} {p.primary_category} <span className="text-indigo-400">{p.subcategory}</span>
                  </h4>
                  <div className={`border px-3 py-1 rounded-md text-sm font-bold ${badgeClass}`}>
                    Priority Score: {score}/100
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm text-slate-400 mt-3 bg-[#0d1117] p-3 rounded-lg border border-[#1e293b]">
                  <div><strong className="text-slate-300">Frequency:</strong> {p.frequency_pct.toFixed(1)}% ({p.review_count} reviews)</div>
                  <div><strong className="text-slate-300">Severity:</strong> {p.avg_severity.toFixed(1)}/5.0</div>
                  <div><strong className="text-slate-300">Business Impact:</strong> {p.avg_business_impact.toFixed(1)}/5.0</div>
                  <div><strong className="text-slate-300">Trend:</strong> {p.trend_label}</div>
                </div>

                {p.sample_note && (
                  <div className="text-amber-400 text-xs mt-3 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    {p.sample_note}
                  </div>
                )}

                <button 
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 flex items-center font-medium transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} className="mr-1"/> : <ChevronDown size={16} className="mr-1"/>}
                  View Sample Reviews ({p.samples?.length || 0} samples)
                </button>

                {isExpanded && p.samples && (
                  <div className="mt-3 space-y-3 bg-[#0a0d14] p-4 rounded-lg border border-[#1e293b]">
                    {p.samples.map((sample: any, sIdx: number) => (
                      <div key={sIdx} className="text-sm text-slate-300 pb-3 border-b border-[#1e293b] last:border-0 last:pb-0">
                        <span className="font-bold text-amber-400 mr-2">[{sample.rating}★]</span>
                        <span className="italic">"{sample.text}"</span>
                        <span className="text-slate-500 ml-2 font-mono text-xs">— {sample.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
