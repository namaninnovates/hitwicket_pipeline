import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Database,
  Terminal,
  Cpu,
  AlertCircle,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Hash,
  Gamepad2,
  Clock,
  Sparkles,
  Layers,
  CheckSquare,
  SquareDashed
} from "lucide-react";
import InfoTooltip from "./Tooltip";


export default function PipelineSidebar({
  games,
  selectedGame,
  setSelectedGame,
  hideFilters = false,
  onComplete,
  onClose,
}: any) {
  const [maxRevs, setMaxRevs] = useState(150);
  const [windowDays, setWindowDays] = useState(90);
  const [selectedGameList, setSelectedGameList] = useState<string[]>(["hitwicket", "tennis_clash", "baseball_clash"]);
  const [freshMode, setFreshMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCautionModal, setShowCautionModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "stopped" | "error">("idle");
  const [currentStage, setCurrentStage] = useState<string>("");
  const [completionStats, setCompletionStats] = useState<{ duration?: string; timestamp?: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleRequestClose = () => {
    if (isStreaming || status === "running") {
      setShowCautionModal(true);
    } else {
      onClose?.();
    }
  };

  const fetchDbStatus = () => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        if (data.overall) setDbStatus(data.overall);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleGame = (gameKey: string) => {
    if (selectedGameList.includes(gameKey)) {
      setSelectedGameList(selectedGameList.filter((g) => g !== gameKey));
    } else {
      setSelectedGameList([...selectedGameList, gameKey]);
    }
  };

  const selectAllGames = () => {
    setSelectedGameList(Object.keys(games));
  };

  const unselectAllGames = () => {
    setSelectedGameList([]);
  };

  const runPipeline = async () => {
    if (selectedGameList.length === 0) return;
    setIsStreaming(true);
    setStatus("running");
    setCurrentStage("Initializing...");
    setCompletionStats(null);
    startTimeRef.current = Date.now();
    setLogs(["[init] Initializing review intelligence execution..."]);

    const stages = "all";
    const allKeys = Object.keys(games);
    const gamesParam = selectedGameList.length === allKeys.length ? "all" : selectedGameList.join(",");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/pipeline/stream?stages=${stages}&max_reviews=${maxRevs}&days=${windowDays}&games=${gamesParam}&fresh=${freshMode}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "log" || data.type === "status") {
                  const msg = data.msg || "";
                  setLogs((prev) => [...prev, msg]);

                  // Detect active stage
                  if (msg.includes("STAGE: INGEST")) setCurrentStage("1/4 Ingesting");
                  else if (msg.includes("STAGE: CLEAN")) setCurrentStage("2/4 Cleaning");
                  else if (msg.includes("STAGE: CLASSIFY")) setCurrentStage("3/4 Classifying");
                  else if (msg.includes("STAGE: SCORE")) setCurrentStage("4/4 Scoring & Analytics");
                  else if (msg.includes("STAGE: GENERATE BRIEF")) setCurrentStage("Synthesizing Memo");
                } else if (data.type === "complete_payload" && data.payload) {
                  const p = data.payload;
                  if (onComplete) {
                    onComplete(p);
                  }
                } else if (data.type === "done") {
                  const durationSec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
                  setLogs((prev) => [...prev, `✓ Pipeline completed successfully in ${durationSec}s.`]);
                  setStatus("completed");
                  setCurrentStage("Complete");
                  setCompletionStats({
                    duration: `${durationSec}s`,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                  fetchDbStatus();
                  if (onComplete) {
                    onComplete();
                  }
                  setTimeout(() => {
                    if (onClose) onClose();
                  }, 1200);
                } else if (data.type === "error") {
                  setLogs((prev) => [...prev, `[error] ${data.msg}`]);
                  setStatus("error");
                  setCurrentStage("Error");
                }
              } catch (e: any) {
                console.error("Pipeline stream processing error:", e, line);
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setLogs((prev) => [...prev, "[system] ⏹ Pipeline cancelled by user."]);
        setStatus("stopped");
        setCurrentStage("Stopped");
      } else {
        setLogs((prev) => [...prev, `[error] Execution failed: ${e.message || e}`]);
        setStatus("error");
        setCurrentStage("Failed");
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopPipeline = async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      await fetch("/api/pipeline/stop", { method: "POST" });
      setStatus("stopped");
      setCurrentStage("Stopped");
      setLogs((prev) => [...prev, "[system] ⏹ Sent stop signal: process terminated."]);
      fetchDbStatus();
    } catch (e) {
      console.error("Error stopping pipeline:", e);
    } finally {
      setIsStreaming(false);
    }
  };

  const DAY_PRESETS = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "60d", days: 60 },
    { label: "90d", days: 90 },
    { label: "180d", days: 180 },
    { label: "365d", days: 365 },
  ];

  const VOLUME_PRESETS = [
    { label: "50", revs: 50 },
    { label: "100", revs: 100 },
    { label: "150", revs: 150 },
    { label: "300", revs: 300 },
    { label: "500", revs: 500 },
    { label: "1,000", revs: 1000 },
    { label: "Unlimited", revs: 5000 },
  ];

  
  return (
    <div className="w-full flex flex-col h-full bg-white text-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
              <span>Pipeline Control Center</span>
              <InfoTooltip content="Manage automated Google Play scraping, rule-based classification, priority scoring, and executive report synthesis." />
            </h1>
            <p className="text-xs text-slate-500">Configure ingestion time window &amp; review limits</p>
          </div>
        </div>

        {/* Global Pipeline Status Pill & Close Trigger in Header */}
        <div className="flex items-center gap-2">
          {status === "running" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              {currentStage || "Running..."}
            </span>
          )}
          {status === "completed" && completionStats && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Completed ({completionStats.duration})
            </span>
          )}
          {status === "stopped" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold">
              <AlertCircle size={13} className="text-amber-600" />
              Stopped
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold">
              <XCircle size={13} className="text-rose-600" />
              Failed
            </span>
          )}

          {/* Close button */}
          <button
            type="button"
            id="pipeline-close-trigger"
            onClick={handleRequestClose}
            className="text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full border border-slate-200 transition-all cursor-pointer"
            title="Close Console"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Controls Form */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* 1. Target Games Multi-Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Target Game Titles
              </label>
              <InfoTooltip content="Select which games to include in the ingestion and analysis run. You can click any game to toggle or unselect it." />
            </div>
            <div className="flex items-center gap-2 text-[0.68rem]">
              <button
                type="button"
                onClick={selectAllGames}
                className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-400">|</span>
              <button
                type="button"
                onClick={unselectAllGames}
                className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Unselect All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(games).map((key) => {
              const isSelected = selectedGameList.includes(key);
              const g = games[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleGame(key)}
                  className={`p-3 rounded-2xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="truncate font-bold">{g.name}</div>
                  <div className="text-[0.65rem] opacity-70 mt-0.5">{isSelected ? "Selected" : "Unselected"}</div>
                </button>
              );
            })}
          </div>
          {selectedGameList.length === 0 && (
            <p className="text-[0.68rem] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle size={12} /> Please select at least one game title to run the pipeline.
            </p>
          )}
        </div>

        {/* 2. Review Window */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Calendar size={14} className="text-indigo-600" />
              <span>Review Time Window</span>
              <InfoTooltip content="Set the lookback window in days. Click any preset to select or unselect it." />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="365"
                value={windowDays}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(365, parseInt(e.target.value) || 1));
                  setWindowDays(val);
                }}
                className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono text-indigo-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DAY_PRESETS.map((p) => {
              const isActive = windowDays === p.days;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setWindowDays(isActive ? 90 : p.days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "bg-slate-200/70 text-slate-700 hover:bg-slate-300"
                  }`}
                  title={isActive ? "Click to unselect (resets to 90d)" : `Set window to ${p.label}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Review Volume Limit */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Hash size={14} className="text-indigo-600" />
              <span>Max Reviews per Game</span>
              <InfoTooltip content="Limit the maximum reviews scraped per game. Click 'Unlimited' to fetch all available reviews." />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="5000"
                step="10"
                value={maxRevs}
                onChange={(e) => {
                  const val = Math.max(10, Math.min(5000, parseInt(e.target.value) || 10));
                  setMaxRevs(val);
                }}
                className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono text-indigo-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">revs</span>
            </div>
          </div>

          {/* Quick Review Count Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {VOLUME_PRESETS.map((p) => {
              const isActive = maxRevs === p.revs;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMaxRevs(isActive ? 150 : p.revs)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "bg-slate-200/70 text-slate-700 hover:bg-slate-300"
                  }`}
                  title={isActive ? "Click to unselect (resets to 150)" : `Set volume limit to ${p.label}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Incremental Merge vs Fresh Purge Toggle */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Fresh Purge Mode</span>
              <InfoTooltip content="When OFF (Recommended), newly scraped reviews merge cumulatively with existing historical reviews (e.g. Day 0–100 retained intact, adding Day 100–110). Turn ON only to purge previous reviews and start fresh." />
            </div>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">
              {freshMode
                ? "⚠️ Purge prior reviews for selected games and start fresh"
                : "✓ Incremental Merge: Preserves past reviews and adds new ones intact"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFreshMode(!freshMode)}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              freshMode ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
            }`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-xs" />
          </button>
        </div>

        {/* Pipeline Control & Status Bar */}
        <div className="space-y-2.5">
          {isStreaming ? (
            <div className="flex gap-2">
              <button
                disabled
                className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 text-white flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <RefreshCw size={16} className="animate-spin text-white" />
                <span>Executing ({currentStage || `${windowDays}d, ${maxRevs} revs`})...</span>
              </button>
              <button
                type="button"
                onClick={stopPipeline}
                className="py-3.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Stop running pipeline immediately"
              >
                <Square size={14} fill="currentColor" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={runPipeline}
              disabled={selectedGameList.length === 0}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 transition-all cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>Trigger Pipeline Now ({selectedGameList.length} Game{selectedGameList.length === 1 ? "" : "s"})</span>
            </button>
          )}

          {/* Completion & Execution Status Card */}
          {status !== "idle" && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                status === "completed"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : status === "running"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                  : status === "stopped"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {status === "completed" && <CheckCircle2 size={16} className="text-emerald-600" />}
                {status === "running" && <RefreshCw size={16} className="animate-spin text-indigo-600" />}
                {status === "stopped" && <AlertCircle size={16} className="text-amber-600" />}
                {status === "error" && <XCircle size={16} className="text-rose-600" />}
                <div>
                  <div className="font-bold">
                    {status === "completed" && "Pipeline Execution Succeeded"}
                    {status === "running" && `Active Stage: ${currentStage || "Processing..."}`}
                    {status === "stopped" && "Pipeline Execution Stopped"}
                    {status === "error" && "Pipeline Execution Error"}
                  </div>
                  {completionStats && status === "completed" && (
                    <div className="text-[0.65rem] opacity-80 mt-0.5">
                      Finished in {completionStats.duration} at {completionStats.timestamp}
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono text-[0.65rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200">
                {status}
              </span>
            </div>
          )}
        </div>

        {/* Database Quick Health */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wider">
              <Database size={14} className="text-indigo-600" />
              <span>Local Telemetry Database</span>
              <InfoTooltip content="Stores reviews in your private local database. If you want only reviews from your new run, click 'Reset DB'." />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Are you sure you want to clear all locally stored reviews and reset your database?")) {
                  await fetch("/api/database/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirm: "RESET" }),
                  }).catch(() => {});
                  fetchDbStatus();
                  setLogs(["[system] Local database reset: all reviews & classifications cleared."]);
                  window.location.reload();
                }
              }}
              className="text-[0.65rem] text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded border border-rose-200 transition-all cursor-pointer font-medium"
            >
              Reset DB
            </button>
          </div>
          {dbStatus ? (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[0.65rem] text-slate-500 font-medium">Total Ingested</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{dbStatus.ingested?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[0.65rem] text-slate-500 font-medium">Classified</div>
                <div className="text-sm font-bold text-indigo-600 mt-0.5">{dbStatus.classified?.toLocaleString() || 0}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Loading database state...</div>
          )}
        </div>

        {/* Live Execution Stream */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Terminal size={14} className="text-indigo-600" />
                <span>Execution Stream Log</span>
                <InfoTooltip content="Live Server-Sent Events (SSE) stream directly outputting sub-process console logs." />
              </div>
              {isStreaming ? (
                <span className="inline-flex items-center gap-1 text-[0.65rem] text-emerald-600 font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-[0.65rem] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 h-48 overflow-y-auto font-mono text-[0.7rem] text-slate-100 space-y-1 shadow-inner">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes("[error]")
                      ? "text-rose-400"
                      : log.includes("✓") || log.includes("[done]")
                      ? "text-emerald-400 font-bold"
                      : log.includes("[stage") || log.includes("STAGE:") || log.includes("Executing:")
                      ? "text-indigo-300 font-semibold"
                      : "text-slate-300"
                  }
                >
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Running Pipeline Caution Modal */}
      {showCautionModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-sm w-full glass-panel rounded-3xl p-6 border border-amber-500/30 shadow-2xl bg-[#0d121f] text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Pipeline Execution in Progress</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                The review intelligence pipeline is actively executing. What would you like to do?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCautionModal(false);
                  onClose?.();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
              >
                Keep Running in Background
              </button>
              <button
                type="button"
                onClick={async () => {
                  await stopPipeline();
                  setShowCautionModal(false);
                  onClose?.();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
              >
                End Pipeline &amp; Close
              </button>
              <button
                type="button"
                onClick={() => setShowCautionModal(false)}
                className="py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel &amp; Stay in Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
