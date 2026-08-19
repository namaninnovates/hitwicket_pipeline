import { useState, useEffect } from "react";
import { Play, Database, Calendar } from "lucide-react";

export default function PipelineSidebar({ games, selectedGame, setSelectedGame }) {
  const [pipelineMode, setPipelineMode] = useState("Full Pipeline (All Stages)");
  const [maxRevs, setMaxRevs] = useState(150);
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const fetchDbStatus = () => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        if (data.overall) setDbStatus(data.overall);
      });
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const runPipeline = async () => {
    setIsStreaming(true);
    setLogs([]);
    let stages = "all";
    if (pipelineMode.includes("1.")) stages = "ingest";
    else if (pipelineMode.includes("2.")) stages = "classify";
    else if (pipelineMode.includes("3.")) stages = "score,brief";

    try {
      const response = await fetch(`/api/pipeline/stream?stages=${stages}&max_reviews=${maxRevs}`);
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
                  setLogs((prev) => [...prev, data.msg]);
                } else if (data.type === "done") {
                  fetchDbStatus();
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsStreaming(false);
  };

  return (
    <div className="w-72 bg-[#101524] border-r border-[#28334e] flex flex-col h-full">
      <div className="p-4 border-b border-[#28334e]">
        <h1 className="text-lg font-bold text-white">Hitwicket Pipeline</h1>
        <p className="text-xs text-slate-400">Founder's Office Decision System</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Pipeline Controller</h2>
        
        <label className="block text-xs text-slate-400 mb-1">Execution Target</label>
        <select 
          className="w-full bg-[#1e293b] border border-[#28334e] rounded-md px-2 py-1.5 text-sm text-slate-200 mb-4 focus:outline-none focus:border-indigo-500"
          value={pipelineMode}
          onChange={(e) => setPipelineMode(e.target.value)}
        >
          <option>Full Pipeline (All Stages)</option>
          <option>1. Ingest Reviews Only</option>
          <option>2. Classify Unclassified Only</option>
          <option>3. Score & Brief Only</option>
        </select>

        <label className="block text-xs text-slate-400 mb-1">Max Reviews per Game: {maxRevs}</label>
        <input 
          type="range" 
          min="50" max="2000" step="50" 
          value={maxRevs}
          onChange={(e) => setMaxRevs(parseInt(e.target.value))}
          className="w-full mb-6 accent-indigo-500"
        />

        <button 
          onClick={runPipeline}
          disabled={isStreaming}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors mb-6"
        >
          <Play size={16} />
          <span>{isStreaming ? "Running..." : "Run Pipeline Now"}</span>
        </button>

        <div className="w-full h-px bg-[#28334e] mb-6"></div>

        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center"><Filter size={16} className="mr-2"/> View Filters</h2>
        
        <label className="block text-xs text-slate-400 mb-1">Select Game View</label>
        <select 
          className="w-full bg-[#1e293b] border border-[#28334e] rounded-md px-2 py-1.5 text-sm text-slate-200 mb-6 focus:outline-none focus:border-indigo-500"
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
        >
          <option value="all">All Games</option>
          {Object.entries(games).map(([key, g]: any) => (
            <option key={key} value={key}>{g.name}</option>
          ))}
        </select>

        <div className="w-full h-px bg-[#28334e] mb-6"></div>

        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center"><Database size={16} className="mr-2"/> Database Status</h2>
        {dbStatus ? (
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Total Ingested:</span>
              <span className="text-white font-medium">{dbStatus.ingested?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Classified:</span>
              <span className="text-amber-400 font-medium">{dbStatus.classified?.toLocaleString() || 0}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading...</p>
        )}
      </div>

      {isStreaming && (
        <div className="p-4 border-t border-[#28334e] bg-[#0d1117] h-64 flex flex-col">
          <div className="text-xs font-semibold text-slate-400 mb-2">Live Execution Log</div>
          <div className="flex-1 overflow-y-auto text-xs font-mono text-blue-400 whitespace-pre-wrap flex flex-col-reverse">
            <div>
              {logs.slice(-20).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
