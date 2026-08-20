"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Calculator,
  Tags,
  Layers,
  Database,
  History,
  Copy,
  Check,
  Search,
  ChevronRight,
  Lightbulb,
  Target,
  Bookmark,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Sliders,
  FileText,
  ListOrdered,
  Radio,
  FlaskConical,
  Cpu,
  AlertCircle,
  Rocket,
  Gamepad2,
  TrendingUp,
  DollarSign,
  Zap,
  Trophy,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import InfoTooltip from "./Tooltip";
import CricketLoader from "./CricketLoader";

const DOCS = [
  {
    id: "scoring",
    label: "Scoring Model",
    file: "SCORING.md",
    icon: <Calculator size={15} />,
    desc: "Mathematical priority formula, weights & safeguards",
  },
  {
    id: "taxonomy",
    label: "NLP Taxonomy",
    file: "TAXONOMY.md",
    icon: <Tags size={15} />,
    desc: "5 categories, 17 subcategories & player quotes",
  },
  {
    id: "readme",
    label: "Architecture",
    file: "README.md",
    icon: <Layers size={15} />,
    desc: "Next.js + FastAPI + Neon pipeline pipeline",
  },
  {
    id: "sources",
    label: "Data Sources",
    file: "SOURCE_RESEARCH.md",
    icon: <Database size={15} />,
    desc: "Google Play scraping & rate limit validation",
  },
  {
    id: "worklog",
    label: "AI Worklog",
    file: "AI_WORKLOG.md",
    icon: <History size={15} />,
    desc: "Engineering decisions, prompts & caught mistakes",
  },
];

// Helper to match heading text to a sleek Lucide icon
function getHeadingIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("priority") || t.includes("model") || t.includes("target"))
    return <Target size={18} className="text-indigo-400 shrink-0" />;
  if (t.includes("summary") || t.includes("executive"))
    return <Bookmark size={18} className="text-amber-400 shrink-0" />;
  if (t.includes("formula") || t.includes("calculation"))
    return <Calculator size={18} className="text-cyan-400 shrink-0" />;
  if (t.includes("components") || t.includes("metrics") || t.includes("breakdown") || t.includes("four"))
    return <BarChart3 size={18} className="text-emerald-400 shrink-0" />;
  if (t.includes("evidence") || t.includes("rationale") || t.includes("selection") || t.includes("justification"))
    return <Sparkles size={18} className="text-purple-400 shrink-0" />;
  if (t.includes("protection") || t.includes("safeguard") || t.includes("outlier") || t.includes("guard"))
    return <ShieldCheck size={18} className="text-blue-400 shrink-0" />;
  if (t.includes("tier") || t.includes("risk"))
    return <Sliders size={18} className="text-rose-400 shrink-0" />;
  if (t.includes("example") || t.includes("worked"))
    return <FileText size={18} className="text-indigo-400 shrink-0" />;
  if (t.includes("taxonomy") || t.includes("categories"))
    return <ListOrdered size={18} className="text-violet-400 shrink-0" />;
  if (t.includes("architecture") || t.includes("pipeline"))
    return <Layers size={18} className="text-cyan-400 shrink-0" />;
  if (t.includes("source") || t.includes("data") || t.includes("scraper") || t.includes("feed"))
    return <Radio size={18} className="text-blue-400 shrink-0" />;
  if (t.includes("research") || t.includes("empirical") || t.includes("test") || t.includes("validation"))
    return <FlaskConical size={18} className="text-emerald-400 shrink-0" />;
  if (t.includes("worklog") || t.includes("tools") || t.includes("stack") || t.includes("engineering"))
    return <Cpu size={18} className="text-fuchsia-400 shrink-0" />;
  if (t.includes("mistake") || t.includes("bug"))
    return <AlertCircle size={18} className="text-rose-400 shrink-0" />;
  if (t.includes("optimization") || t.includes("decision"))
    return <Rocket size={18} className="text-amber-400 shrink-0" />;
  if (t.includes("gameplay"))
    return <Gamepad2 size={18} className="text-indigo-400 shrink-0" />;
  if (t.includes("progression"))
    return <TrendingUp size={18} className="text-emerald-400 shrink-0" />;
  if (t.includes("monetization") || t.includes("price") || t.includes("cost"))
    return <DollarSign size={18} className="text-amber-400 shrink-0" />;
  if (t.includes("experience"))
    return <Zap size={18} className="text-yellow-400 shrink-0" />;
  if (t.includes("competition") || t.includes("social"))
    return <Trophy size={18} className="text-fuchsia-400 shrink-0" />;
  if (t.includes("exclusion") || t.includes("merger"))
    return <XCircle size={18} className="text-slate-400 shrink-0" />;
  return <BookOpen size={18} className="text-indigo-400 shrink-0" />;
}

// Regex to strip raw unicode emojis from text
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;

function cleanString(str: string): string {
  return str.replace(EMOJI_REGEX, "").trim();
}

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props && node.props.children) return extractText(node.props.children);
  return "";
}

// Transform text nodes to replace status indicators with modern badges/icons
function formatTextWithModernIcons(text: string): React.ReactNode {
  if (typeof text !== "string") return text;

  // Split by known emoji markers
  const parts = text.split(/(🔴|🟡|🟢|✅|❌|⚠️)/g);
  if (parts.length === 1 && !EMOJI_REGEX.test(text)) return text;

  return parts.map((part, i) => {
    if (part === "🔴") {
      return (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold text-[0.7rem] mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        </span>
      );
    }
    if (part === "🟡") {
      return (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-[0.7rem] mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </span>
      );
    }
    if (part === "🟢") {
      return (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-[0.7rem] mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </span>
      );
    }
    if (part === "✅") {
      return <CheckCircle2 key={i} size={13} className="text-emerald-400 inline shrink-0 mr-1 align-text-bottom" />;
    }
    if (part === "❌") {
      return <XCircle key={i} size={13} className="text-rose-400 inline shrink-0 mr-1 align-text-bottom" />;
    }
    if (part === "⚠️") {
      return <AlertTriangle key={i} size={13} className="text-amber-400 inline shrink-0 mr-1 align-text-bottom" />;
    }
    return cleanString(part);
  });
}

export default function Documentation() {
  const [activeDoc, setActiveDoc] = useState("scoring");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
  const freqNorm = Math.min(100, Math.max(0, calcFreq * 3));
  const sevNorm = ((calcSev - 1) / 4) * 100;
  const impactNorm = ((calcImpact - 1) / 4) * 100;
  const clampedTrend = Math.max(-100, Math.min(200, calcTrend));
  const trendNorm = (clampedTrend + 100) / 3;

  const liveScore = Math.round(
    0.3 * freqNorm + 0.25 * sevNorm + 0.25 * impactNorm + 0.2 * trendNorm
  );

  let scoreColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  let scoreBadge = "Low Risk (Healthy Baseline)";
  if (liveScore >= 50) {
    scoreColor = "text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    scoreBadge = "Critical Priority (Immediate Fix)";
  } else if (liveScore >= 30) {
    scoreColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    scoreBadge = "Moderate Friction (Sprint Planning)";
  }

  // Filter content if search query is active
  const displayContent = searchQuery
    ? content
        .split("\n\n")
        .filter((block) => block.toLowerCase().includes(searchQuery.toLowerCase()))
        .join("\n\n") || `*No sections matching "${searchQuery}" in this document.*`
    : content;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.3)]">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center">
              <span>Documentation &amp; Methodology</span>
              <InfoTooltip
                content="Comprehensive engineering specifications, scoring formulas, taxonomy design, and empirical research."
                position="bottom"
              />
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Structured reference specifications for the Hitwicket Review Intelligence Pipeline
            </p>
          </div>
        </div>

        <button
          onClick={copyDoc}
          disabled={!content}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer shadow-sm hover:border-indigo-500/40"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? "Copied Markdown" : "Copy Document"}</span>
        </button>
      </div>

      {/* Interactive Scoring Simulator (When scoring doc is active) */}
      {activeDoc === "scoring" && (
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-[#0d1222]/80 to-[#0b0f19] relative z-20 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Calculator size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Interactive Priority Score Simulator</span>
                  <InfoTooltip
                    content="Adjust the 4 input parameters to test how the mathematical formula weights frequencies, severity, business threat, and trend velocity into a 0-100 score."
                    position="bottom"
                  />
                </h2>
                <p className="text-xs text-slate-400">
                  Active Formula: Priority = 0.30(Freq) + 0.25(Sev) + 0.25(Impact) + 0.20(Trend)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCalcFreq(18);
                setCalcSev(4.2);
                setCalcImpact(4.5);
                setCalcTrend(36);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:border-indigo-400 self-start sm:self-auto"
              title="Reset inputs to default production benchmark values (18% Freq, 4.2 Sev, 4.5 Impact, +36% Trend)"
            >
              <RotateCcw size={13} className="text-indigo-400" />
              <span>Reset Default Weights (30/25/25/20)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequency */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">1. Frequency (30% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{calcFreq}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={calcFreq}
                  onChange={(e) => setCalcFreq(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-400 mt-1.5 flex justify-between">
                  <span>Isolated bug (1%)</span>
                  <span>Major crisis (30%+)</span>
                </div>
              </div>

              {/* Severity */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">2. Severity (25% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{calcSev.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcSev}
                  onChange={(e) => setCalcSev(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-400 mt-1.5 flex justify-between">
                  <span>Minor flaw (1.0)</span>
                  <span>Uninstall (5.0)</span>
                </div>
              </div>

              {/* Business Impact */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">3. Business Impact (25% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{calcImpact.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcImpact}
                  onChange={(e) => setCalcImpact(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-400 mt-1.5 flex justify-between">
                  <span>Cosmetic (1.0)</span>
                  <span>Revenue killer (5.0)</span>
                </div>
              </div>

              {/* Trend */}
              <div className="bg-black/40 rounded-2xl p-4 border border-white/[0.08] hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">4. Trend Trajectory (20% weight)</span>
                  <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {calcTrend >= 0 ? `+${calcTrend}%` : `${calcTrend}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="200"
                  step="5"
                  value={calcTrend}
                  onChange={(e) => setCalcTrend(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-400 mt-1.5 flex justify-between">
                  <span>Resolving (-100%)</span>
                  <span>Escalating (+200%)</span>
                </div>
              </div>
            </div>

            {/* Right Output Score Box */}
            <div className="lg:col-span-4 bg-gradient-to-b from-black/80 to-black/50 rounded-2xl p-6 border border-white/10 text-center flex flex-col justify-center items-center shadow-xl">
              <div className="text-[0.7rem] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Computed Priority Score
              </div>
              <div className="text-5xl font-extrabold tracking-tight text-white my-2 font-mono">
                {liveScore} <span className="text-lg text-slate-500 font-normal">/ 100</span>
              </div>
              <div className={`mt-3 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${scoreColor}`}>
                {scoreBadge}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {DOCS.map((d) => {
          const isActive = activeDoc === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setActiveDoc(d.id);
                setSearchQuery("");
              }}
              className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                isActive
                  ? "bg-gradient-to-br from-indigo-600/30 to-purple-600/20 text-white border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={isActive ? "text-indigo-300" : "text-slate-400"}>{d.icon}</span>
                <span className="text-xs font-bold truncate">{d.label}</span>
              </div>
              <p className="text-[0.68rem] text-slate-400 line-clamp-2 leading-tight">
                {d.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Document Content Container */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10 border border-white/[0.08] bg-[#0b0f19]/90 shadow-2xl relative">
        {/* Document Subheader & In-doc Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="text-indigo-400 font-mono">HITWICKET INTELLIGENCE</span>
            <ChevronRight size={14} />
            <span className="text-white">{DOCS.find((d) => d.id === activeDoc)?.file}</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in this document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20">
            <CricketLoader
              label="Loading Documentation Specification..."
              subtext="Rendering markdown, formulas, and rubrics"
              size="md"
            />
          </div>
        ) : (
          <div className="prose prose-invert prose-indigo max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:text-white prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h2:text-xl prose-h2:text-indigo-200 prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-base prose-h3:text-slate-200 prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-white prose-strong:font-bold prose-code:text-indigo-300 prose-code:bg-indigo-950/40 prose-code:border prose-code:border-indigo-500/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-black/80 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl prose-pre:p-5 prose-table:border-collapse prose-table:w-full prose-th:bg-indigo-950/30 prose-th:text-indigo-200 prose-th:p-3.5 prose-th:border-b prose-th:border-white/10 prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-td:p-3.5 prose-td:border-b prose-td:border-white/5 prose-td:text-xs prose-td:text-slate-300 prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-950/20 prose-blockquote:p-4 prose-blockquote:rounded-r-2xl prose-blockquote:text-indigo-200">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children, ...props }) => {
                  const rawText = extractText(children);
                  const title = cleanString(rawText);
                  const icon = getHeadingIcon(title);
                  return (
                    <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-white border-b border-white/10 pb-3" {...props}>
                      <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        {icon}
                      </span>
                      <span>{title}</span>
                    </h1>
                  );
                },
                h2: ({ children, ...props }) => {
                  const rawText = extractText(children);
                  const title = cleanString(rawText);
                  const icon = getHeadingIcon(title);
                  return (
                    <h2 className="flex items-center gap-2.5 text-xl font-bold text-indigo-200 mt-8 mb-4 border-b border-white/[0.06] pb-2" {...props}>
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {icon}
                      </span>
                      <span>{title}</span>
                    </h2>
                  );
                },
                h3: ({ children, ...props }) => {
                  const rawText = extractText(children);
                  const title = cleanString(rawText);
                  const icon = getHeadingIcon(title);
                  return (
                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100 mt-6 mb-3" {...props}>
                      <span className="p-1 rounded bg-white/[0.05] text-slate-400">
                        {icon}
                      </span>
                      <span>{title}</span>
                    </h3>
                  );
                },
                p: ({ children, ...props }) => {
                  return (
                    <p className="text-slate-300 leading-relaxed my-3" {...props}>
                      {React.Children.map(children, (child) =>
                        typeof child === "string" ? formatTextWithModernIcons(child) : child
                      )}
                    </p>
                  );
                },
                li: ({ children, ...props }) => {
                  return (
                    <li className="text-slate-300 my-1" {...props}>
                      {React.Children.map(children, (child) =>
                        typeof child === "string" ? formatTextWithModernIcons(child) : child
                      )}
                    </li>
                  );
                },
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-6 rounded-2xl border border-white/[0.08] shadow-lg bg-black/30">
                    <table className="w-full text-left text-xs border-collapse" {...props} />
                  </div>
                ),
                th: ({ ...props }) => (
                  <th
                    className="bg-indigo-950/40 text-indigo-300 font-bold px-4 py-3 border-b border-white/10 uppercase tracking-wider text-[0.7rem]"
                    {...props}
                  />
                ),
                td: ({ children, ...props }) => (
                  <td className="px-4 py-3 border-b border-white/[0.05] text-slate-300" {...props}>
                    {React.Children.map(children, (child) =>
                      typeof child === "string" ? formatTextWithModernIcons(child) : child
                    )}
                  </td>
                ),
                blockquote: ({ ...props }) => (
                  <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-black/40 border-l-4 border-indigo-500 border-y border-r border-white/5 text-indigo-200 text-xs sm:text-sm leading-relaxed shadow-md flex items-start gap-3">
                    <Lightbulb size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>{props.children}</div>
                  </div>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
