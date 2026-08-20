"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, Calculator, Tags, Layers, Database, History, Copy, Check, Sparkles, RefreshCw } from "lucide-react";
import InfoTooltip from "./Tooltip";

const DOCS = [
  { id: "scoring", label: "Scoring Model", file: "SCORING.md", icon: <Calculator size={14} />, desc: "Priority formula, weights & normalization" },
  { id: "taxonomy", label: "NLP Taxonomy", file: "TAXONOMY.md", icon: <Tags size={14} />, desc: "Categories, subcategories & sentiment rules" },
  { id: "readme", label: "System Architecture", file: "README.md", icon: <Layers size={14} />, desc: "FastAPI + Next.js pipeline overview" },
  { id: "sources", label: "Data Sources", file: "SOURCE_RESEARCH.md", icon: <Database size={14} />, desc: "Google Play scraping & rate limits" },
  { id: "worklog", label: "AI Worklog", file: "AI_WORKLOG.md", icon: <History size={14} />, desc: "Build trajectory & engineering log" },
];

export default function Documentation() {
  const [activeDoc, setActiveDoc] = useState("scoring");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Interactive Scoring Calculator State
  const [calcFreq, setCalcFreq] = useState(15); // 15%
  const [calcSev, setCalcSev] = useState(4.2); // 1.0 - 5.0
  const [calcImpact, setCalcImpact] = useState(4.0); // 1.0 - 5.0
  const [calcTrend, setCalcTrend] = useState(40); // % change

  useEffect(() => {
    setLoading(true);
    fetch(`/api/docs/${activeDoc}`)
      .then((res) => res.json())
      .then((data) => {
        setContent(data.content || "");
        setLoading(false);
      })
      .catch(() => {
        setContent("Failed to load document.");
        setLoading(false);
      });
  }, [activeDoc]);

  const copyDoc = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute live interactive score
  const freqNorm = Math.min(100, Math.max(0, calcFreq * 3)); // normalized scale
  const sevNorm = ((calcSev - 1) / 4) * 100;
  const impactNorm = ((calcImpact - 1) / 4) * 100;
  const clampedTrend = Math.max(-100, Math.min(200, calcTrend));
  const trendNorm = (clampedTrend + 100) / 3;

  const liveScore = Math.round(
    0.3 * freqNorm + 0.25 * sevNorm + 0.25 * impactNorm + 0.2 * trendNorm
  );

  let scoreColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  let scoreBadge = "Low Risk (Healthy)";
  if (liveScore >= 45) {
    scoreColor = "text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    scoreBadge = "Critical Priority (Immediate Fix)";
  } else if (liveScore >= 30) {
    scoreColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    scoreBadge = "Moderate Friction (Sprint Planning)";
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
              <span>System Documentation &amp; Methodology</span>
              <InfoTooltip content="Comprehensive engineering documentation, mathematical priority formulas, and taxonomy design." />
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed specifications for the Hitwicket Review Intelligence Engine
            </p>
          </div>
        </div>

        <button
          onClick={copyDoc}
          disabled={!content}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? "Copied Markdown" : "Copy Document"}</span>
        </button>
      </div>

      {/* Interactive Scoring Simulator (When scoring doc is active) */}
      {activeDoc === "scoring" && (
        <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Interactive Priority Score Simulator
            </h2>
            <InfoTooltip content="Drag the sliders to test how different metric combinations calculate the 0-100 priority score and change risk tiers." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequency */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">Frequency (30% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold">{calcFreq}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={calcFreq}
                  onChange={(e) => setCalcFreq(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Severity */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">Severity (25% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold">{calcSev.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcSev}
                  onChange={(e) => setCalcSev(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Business Impact */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">Business Impact (25% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold">{calcImpact.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcImpact}
                  onChange={(e) => setCalcImpact(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Trend */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-300">Trend Trajectory (20% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold">{calcTrend >= 0 ? `+${calcTrend}%` : `${calcTrend}%`}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="200"
                  step="5"
                  value={calcTrend}
                  onChange={(e) => setCalcTrend(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Right Output Score Box */}
            <div className="lg:col-span-4 bg-black/60 rounded-2xl p-5 border border-white/10 text-center flex flex-col justify-center items-center">
              <div className="text-[0.68rem] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Calculated Priority Score
              </div>
              <div className="text-4xl font-extrabold tracking-tight text-white my-1 font-mono">
                {liveScore} <span className="text-base text-slate-500 font-normal">/ 100</span>
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border ${scoreColor}`}>
                {scoreBadge}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/[0.08]">
        {DOCS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDoc(d.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeDoc === d.id
                ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)] border border-indigo-400/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {d.icon}
            <span>{d.label}</span>
          </button>
        ))}
      </div>

      {/* Document Content Box */}
      <div className="glass-panel rounded-3xl p-6 lg:p-10 border border-white/[0.08]">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-indigo-400 mb-3" />
            <span className="text-xs">Loading documentation...</span>
          </div>
        ) : (
          <div className="prose prose-invert prose-indigo max-w-none prose-headings:text-white prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-indigo-200 prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/10">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
