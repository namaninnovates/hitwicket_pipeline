"use client";

import { useState, useEffect } from "react";
import {
  History,
  X,
  PlusCircle,
  Clock,
  Trash2,
  ChevronRight,
  FileText,
  Sparkles,
  Gamepad2,
  Globe,
  Database
} from "lucide-react";
import { HistorySnapshot } from "../page";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSnapshotId: string | null;
  onSelectSnapshot: (snapshot: HistorySnapshot | null) => void;
  onNewAnalysis: () => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  activeSnapshotId,
  onSelectSnapshot,
  onNewAnalysis,
}: HistorySidebarProps) {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (e) {
      console.warn("Error fetching history snapshots:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this saved snapshot from your local history?")) {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (activeSnapshotId === id) {
        onSelectSnapshot(null);
      }
      fetchSnapshots();
    }
  };

  // Group snapshots by timeline
  const groupSnapshots = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 86400000 * 7;

    const groups: { label: string; items: HistorySnapshot[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older Sessions", items: [] },
    ];

    snapshots.forEach((snap) => {
      const snapTime = new Date(snap.timestamp).getTime();
      if (snapTime >= today) {
        groups[0].items.push(snap);
      } else if (snapTime >= yesterday) {
        groups[1].items.push(snap);
      } else if (snapTime >= last7Days) {
        groups[2].items.push(snap);
      } else {
        groups[3].items.push(snap);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  if (!isOpen) return null;

  const grouped = groupSnapshots();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-start">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out History Drawer (Left Side) */}
      <div className="relative mr-auto w-full max-w-md bg-white border-r border-slate-200 shadow-2xl flex flex-col h-full z-10 font-sans animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <History size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Intelligence History</span>
                <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold">
                  {snapshots.length}
                </span>
              </h2>
              <p className="text-[0.68rem] text-slate-500">Session snapshots in PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Session CTA */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => {
              onSelectSnapshot(null);
              onClose();
              onNewAnalysis();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>+ New Live Analysis / Pipeline Run</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading saved history snapshots...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-3">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Database size={20} />
              </div>
              <p className="font-semibold text-slate-800">No Historical Snapshots Yet</p>
              <p className="text-[0.7rem] text-slate-500 max-w-xs mx-auto">
                Every time you run the intelligence pipeline or generate an executive brief, a snapshot is saved here automatically.
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">
                  {group.label}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((snap) => {
                    const isSelected = activeSnapshotId === snap.id;
                    const dateObj = new Date(snap.timestamp);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

                    return (
                      <div
                        key={snap.id}
                        onClick={() => {
                          onSelectSnapshot(snap);
                          onClose();
                        }}
                        className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {snap.game === "all" ? (
                              <Globe size={13} className="text-cyan-600 shrink-0" />
                            ) : (
                              <Gamepad2 size={13} className="text-indigo-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-900 tracking-tight line-clamp-1">
                              {snap.title}
                            </span>
                          </div>
                          <span className="text-[0.65rem] font-mono text-slate-500 shrink-0">
                            {timeStr}
                          </span>
                        </div>

                        {/* Snapshot Stats Bar */}
                        <div className="flex items-center gap-2 text-[0.68rem] text-slate-600 mt-1.5">
                          <span className="font-mono text-slate-700 font-medium">{snap.totalReviews} revs</span>
                          <span>&bull;</span>
                          <span className="font-bold text-amber-600">{snap.avgRating}★</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold">{snap.positivePct}% Pos</span>
                          {snap.topPriority && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-500 truncate max-w-[120px]">{snap.topPriority}</span>
                            </>
                          )}
                        </div>

                        {/* Hover Quick Actions */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                          <span className="text-[0.65rem] text-slate-500 font-mono flex items-center gap-1">
                            <Clock size={10} />
                            {dateStr}
                          </span>

                          <button
                            onClick={(e) => handleDelete(e, snap.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete snapshot"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-[0.68rem] text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles size={12} className="text-indigo-600" />
          <span>Snapshots persist permanently in Neon PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}
