import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, FileText, Sparkles, Copy, Check, Globe } from "lucide-react";
import InfoTooltip from "./Tooltip";
import CricketLoader from "./CricketLoader";

export default function FounderBrief({
  selectedGame = "all",
  refreshKey = 0,
}: {
  selectedGame?: string;
  refreshKey?: number;
}) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const isGlobal = selectedGame === "all" || selectedGame === "global";

  const loadBriefForGame = async (gameKey: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brief?game=${gameKey}`);
      if (res.ok) {
        const data = await res.json();
        const text = data.brief || data.content || "";
        setBrief(text);
      }
    } catch (e) {
      console.warn("Could not fetch generated brief:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefForGame(selectedGame);
  }, [selectedGame, refreshKey]);

  const copyToClipboard = () => {
    if (!brief) return;
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-indigo-950 text-white border border-indigo-900 shadow-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-900 text-indigo-300 border border-indigo-800">
            {isGlobal ? <Globe size={20} className="text-cyan-400" /> : <FileText size={20} className="text-indigo-300" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
                <span>
                  {isGlobal
                    ? "Global Market Intelligence Brief"
                    : "Executive 90-Second Founder Brief"}
                </span>
                <InfoTooltip
                  content={
                    isGlobal
                      ? "Cross-game comparative synthesis comparing Hitwicket, Tennis Clash, and Baseball Clash across ratings, complaint velocities, competitor vulnerabilities, and market opportunities."
                      : "Synthesized from prioritized review telemetry, competitor deltas, and user friction patterns into a rapid 90-second executive decision memo."
                  }
                  position="bottom"
                />
              </h2>
              <span
                className={`text-[0.65rem] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isGlobal
                    ? "bg-cyan-950/80 text-cyan-300 border-cyan-800"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                }`}
              >
                {isGlobal ? "Relative Benchmark" : "AI Synthesized"}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              {isGlobal
                ? "Cross-game competitive synthesis: market leaders, rival vulnerabilities, and Hitwicket's strategic attack vectors."
                : "Weekly actionable intelligence: core bottlenecks, rival threat signals, and recommended roadmap fixes."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {brief && (
            <button
              onClick={copyToClipboard}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-indigo-800 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy Markdown"}</span>
            </button>
          )}
          <button
            onClick={() => loadBriefForGame(selectedGame)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {loading ? (
        <div className="py-12">
          <CricketLoader
            label="Loading Saved Executive Brief..."
            subtext="Retrieving pre-generated intelligence memo from database"
            size="md"
            theme="dark"
          />
        </div>
      ) : brief ? (
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-indigo-900/80 bg-indigo-900/30 text-slate-100 leading-relaxed text-sm">
          <div className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-indigo-800 prose-h2:pb-1.5 prose-h3:text-sm prose-p:text-indigo-100 prose-p:text-xs prose-p:leading-relaxed prose-li:text-indigo-100 prose-li:text-xs prose-strong:text-white prose-strong:font-bold prose-hr:border-indigo-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl p-8 border border-indigo-800 bg-indigo-900/40 text-indigo-200 text-center text-sm">
          <Sparkles className="mx-auto mb-2 text-amber-400" size={24} />
          <p className="font-semibold text-white">No Executive Brief Generated for this Selection Yet</p>
          <p className="text-xs text-indigo-300 mt-1">
            Briefs are synthesized exclusively during pipeline executions. Click &quot;Setup Pipeline&quot; in the top-right to run the pipeline for this game.
          </p>
        </div>
      )}
    </div>
  );
}
