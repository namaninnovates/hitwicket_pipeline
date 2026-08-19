import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { RefreshCw } from "lucide-react";

export default function FounderBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrief = () => {
    setLoading(true);
    fetch("/api/briefs/latest")
      .then(res => res.json())
      .then(data => {
        setBrief(data.content);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Executive 90-Second Founder Brief</h2>
          <p className="text-sm text-slate-400">
            Auto-generated weekly executive report focusing on decisions, competitive signals, and actions.
          </p>
        </div>
        <button 
          onClick={fetchBrief}
          className="bg-[#1e293b] hover:bg-[#28334e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#28334e] flex items-center"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Brief
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading brief...</div>
      ) : brief ? (
        <div className="bg-[#131828] border border-[#232d4b] rounded-xl p-8 prose prose-invert prose-indigo max-w-none">
          <ReactMarkdown>{brief}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-amber-400 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
          No generated brief file found. Run 'Score & Brief Only' from the pipeline controller to generate one.
        </div>
      )}
    </div>
  );
}
