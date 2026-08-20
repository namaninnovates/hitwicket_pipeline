import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, FileText, Sparkles, Copy, Check, Globe } from "lucide-react";
import InfoTooltip from "./Tooltip";
import CricketLoader from "./CricketLoader";

export default function FounderBrief({ selectedGame = "all" }: { selectedGame?: string }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isGlobal = selectedGame === "all" || selectedGame === "global";

  const fetchBrief = () => {
    setLoading(true);
    fetch(`/api/brief?game=${selectedGame}`)
      .then((res) => res.json())
      .then((data) => {
        setBrief(data.brief || data.content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrief();
  }, [selectedGame]);

  const copyToClipboard = () => {
    if (!brief) return;
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-400 border border-indigo-500/30">
            {isGlobal ? <Globe size={20} className="text-cyan-400" /> : <FileText size={20} />}
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
                className={`text-[0.65rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isGlobal
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isGlobal ? "Relative Benchmark" : "AI Synthesized"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
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
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy Markdown"}</span>
            </button>
          )}
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12">
          <CricketLoader
            label="Synthesizing Executive Brief with Gemini..."
            subtext="Analyzing 90-day review trajectories and competitor matrices"
            size="md"
          />
        </div>
      ) : brief ? (
        <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/[0.08] bg-black/40 text-slate-200 leading-relaxed text-sm">
          <div className="prose prose-invert prose-indigo max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-indigo-200 prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center glass-card rounded-2xl border-dashed border-amber-500/30 bg-amber-500/5 text-amber-300">
          <Sparkles className="mx-auto mb-2 text-amber-400" size={24} />
          <p className="font-semibold text-white">Database is currently empty — No brief generated</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;Setup Pipeline&quot; in the top right to ingest reviews and synthesize your 90-second executive intelligence memo.
          </p>
        </div>
      )}
    </div>
  );
}
