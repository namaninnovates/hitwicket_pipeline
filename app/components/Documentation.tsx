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

  let scoreColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
  let numberColor = "text-emerald-600";
  let scoreBadge = "Low Risk (Healthy Baseline)";
  if (liveScore >= 50) {
    scoreColor = "text-rose-800 bg-rose-50 border-rose-200";
    numberColor = "text-rose-600";
    scoreBadge = "Critical Priority (Immediate Fix)";
  } else if (liveScore >= 30) {
    scoreColor = "text-amber-800 bg-amber-50 border-amber-200";
    numberColor = "text-amber-600";
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
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center">
              <span>Documentation &amp; Methodology</span>
              <InfoTooltip
                content="Comprehensive engineering specifications, scoring formulas, taxonomy design, and empirical research."
                position="bottom"
              />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Structured reference specifications for the Hitwicket Review Intelligence Pipeline
            </p>
          </div>
        </div>

        <button
          onClick={copyDoc}
          disabled={!content}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer shadow-xs"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          <span>{copied ? "Copied Markdown" : "Copy Document"}</span>
        </button>
      </div>

      {/* Interactive Scoring Simulator (When scoring doc is active) */}
      {activeDoc === "scoring" && (
        <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-slate-200 bg-white relative z-20 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Calculator size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Interactive Priority Score Simulator</span>
                  <InfoTooltip
                    content="Adjust the 4 input parameters to test how the mathematical formula weights frequencies, severity, business threat, and trend velocity into a 0-100 score."
                    position="bottom"
                  />
                </h2>
                <p className="text-xs text-slate-500">
                  Active Formula: Priority = 0.30(Freq) + 0.25(Sev) + 0.25(Impact) + 0.20(Trend)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 4 Interactive Sliders */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frequency */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-800">1. Issue Frequency (30% weight)</span>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                    {calcFreq}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={calcFreq}
                  onChange={(e) => setCalcFreq(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-500 mt-1.5 flex justify-between">
                  <span>Isolated (1%)</span>
                  <span>Systemic (40%)</span>
                </div>
              </div>

              {/* Severity */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-800">2. Technical Severity (25% weight)</span>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                    {calcSev.toFixed(1)} / 5.0
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcSev}
                  onChange={(e) => setCalcSev(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-500 mt-1.5 flex justify-between">
                  <span>Trivial (1.0)</span>
                  <span>Unplayable (5.0)</span>
                </div>
              </div>

              {/* Business Impact */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-800">3. Business Impact (25% weight)</span>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                    {calcImpact.toFixed(1)} / 5.0
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={calcImpact}
                  onChange={(e) => setCalcImpact(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-500 mt-1.5 flex justify-between">
                  <span>Cosmetic (1.0)</span>
                  <span>Revenue killer (5.0)</span>
                </div>
              </div>

              {/* Trend */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-800">4. Trend Trajectory (20% weight)</span>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
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
                  className="w-full accent-indigo-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="text-[0.68rem] text-slate-500 mt-1.5 flex justify-between">
                  <span>Resolving (-100%)</span>
                  <span>Escalating (+200%)</span>
                </div>
              </div>
            </div>

            {/* Right Output Score Box */}
            <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center flex flex-col justify-center items-center shadow-xs">
              <div className="text-[0.7rem] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Computed Priority Score
              </div>
              <div className={`text-5xl font-extrabold tracking-tight my-2 font-mono ${numberColor}`}>
                {liveScore} <span className="text-lg text-slate-400 font-normal">/ 100</span>
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
                  ? "bg-indigo-50 text-indigo-900 border-indigo-300 shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{d.icon}</span>
                <span className="text-xs font-bold truncate">{d.label}</span>
              </div>
              <p className="text-[0.68rem] text-slate-500 line-clamp-2 leading-tight">
                {d.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Document Content Container */}
      <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10 border-2 border-slate-200 bg-white shadow-sm relative">
        {/* Document Subheader & In-doc Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-indigo-600 font-mono font-bold">HITWICKET INTELLIGENCE</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 font-bold">{DOCS.find((d) => d.id === activeDoc)?.file}</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in this document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] text-slate-400 hover:text-slate-700"
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
          <div className="prose max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:text-slate-900 prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-3 prose-h2:text-xl prose-h2:text-slate-900 prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-base prose-h3:text-slate-800 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-strong:font-bold prose-table:border-collapse prose-table:w-full prose-th:bg-slate-100 prose-th:text-slate-800 prose-th:p-3.5 prose-th:border-b prose-th:border-slate-200 prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-td:p-3.5 prose-td:border-b prose-td:border-slate-100 prose-td:text-xs prose-td:text-slate-700 prose-blockquote:border-l-4 prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-50 prose-blockquote:p-4 prose-blockquote:rounded-r-2xl prose-blockquote:text-indigo-950">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre: ({ children, ...props }) => (
                  <div className="not-prose my-6 rounded-2xl overflow-hidden border border-indigo-900 bg-indigo-950 shadow-md">
                    <pre className="p-4 sm:p-5 text-indigo-100 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed bg-indigo-950 m-0 border-0" {...props}>
                      {children}
                    </pre>
                  </div>
                ),
                code: ({ inline, className, children, ...props }: any) => {
                  const isBlock = className || String(children).includes("\n");
                  if (inline || !isBlock) {
                    return (
                      <code className="text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md font-mono text-xs font-semibold not-italic" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="font-mono text-indigo-100 text-xs sm:text-sm bg-transparent border-0 p-0" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children, ...props }) => {
                  const rawText = extractText(children);
                  const title = cleanString(rawText);
                  const icon = getHeadingIcon(title);
                  return (
                    <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-slate-900 border-b border-slate-200 pb-3" {...props}>
                      <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
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
                    <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2" {...props}>
                      <span className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
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
                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mt-6 mb-3" {...props}>
                      <span className="p-1 rounded bg-slate-100 text-slate-600">
                        {icon}
                      </span>
                      <span>{title}</span>
                    </h3>
                  );
                },
                p: ({ children, ...props }) => {
                  return (
                    <p className="text-slate-700 leading-relaxed my-3 text-sm" {...props}>
                      {React.Children.map(children, (child) =>
                        typeof child === "string" ? formatTextWithModernIcons(child) : child
                      )}
                    </p>
                  );
                },
                li: ({ children, ...props }) => {
                  return (
                    <li className="text-slate-700 my-1 text-sm" {...props}>
                      {React.Children.map(children, (child) =>
                        typeof child === "string" ? formatTextWithModernIcons(child) : child
                      )}
                    </li>
                  );
                },
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200 shadow-xs bg-white">
                    <table className="w-full text-left text-xs border-collapse" {...props} />
                  </div>
                ),
                th: ({ ...props }) => (
                  <th
                    className="bg-slate-50 text-slate-800 font-bold px-4 py-3 border-b border-slate-200 uppercase tracking-wider text-[0.7rem]"
                    {...props}
                  />
                ),
                td: ({ children, ...props }) => (
                  <td className="px-4 py-3 border-b border-slate-100 text-slate-700" {...props}>
                    {React.Children.map(children, (child) =>
                      typeof child === "string" ? formatTextWithModernIcons(child) : child
                    )}
                  </td>
                ),
                blockquote: ({ ...props }) => (
                  <div className="my-6 p-4 rounded-2xl bg-indigo-50 border-l-4 border-indigo-600 text-indigo-950 text-xs sm:text-sm leading-relaxed shadow-xs flex items-start gap-3">
                    <Lightbulb size={18} className="text-indigo-600 shrink-0 mt-0.5" />
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
