"use client";

import { useEffect, useState } from "react";
import { listAudits, deleteAudit, clearAllAudits } from "@/lib/storage";
import type { Audit } from "@/lib/schema";

const WATCH_COLORS: Record<string, string> = {
  skip: "#FF4444",
  skim: "#F5A623",
  watch: "#4ADE80",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HistoryDrawer({ open, onClose }: Props) {
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    if (open) setAudits(listAudits());
  }, [open]);

  function handleDelete(videoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteAudit(videoId);
    setAudits((prev) => prev.filter((a) => a.id !== videoId));
  }

  function handleClearAll() {
    if (!confirm(`Delete all ${audits.length} saved audits?`)) return;
    clearAllAudits();
    setAudits([]);
  }

  function handleNavigate(videoId: string) {
    window.location.href = `/?v=${videoId}`;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "360px", backgroundColor: "#171717", borderLeft: "1px solid #27272a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <span
            className="font-display text-amber-400 tracking-widest"
            style={{ fontSize: "1.1rem" }}
          >
            HISTORY
          </span>
          <button
            onClick={onClose}
            className="font-mono text-sm text-zinc-500 hover:text-zinc-200 transition-colors w-7 h-7 flex items-center justify-center"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {audits.length === 0 ? (
            <p className="font-mono text-xs text-zinc-600 text-center mt-10">
              No saved audits
            </p>
          ) : (
            audits.map((audit) => {
              const date = audit.fetchedAt
                ? new Date(audit.fetchedAt).toLocaleDateString()
                : "";
              const hasVerdict = !!audit.video;
              const color = hasVerdict
                ? (WATCH_COLORS[audit.video!.worth_watching] ?? "#f0f0f0")
                : "#71717a";
              const badge = hasVerdict ? audit.video!.worth_watching : "tldr";

              return (
                <div
                  key={audit.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                  style={{ backgroundColor: "#0d0d0d" }}
                  onClick={() => handleNavigate(audit.id)}
                >
                  <span
                    className="font-mono text-xs font-bold uppercase mt-0.5 flex-shrink-0 px-2 py-0.5 rounded"
                    style={{ color, backgroundColor: `${color}22` }}
                  >
                    {badge}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-zinc-200 truncate leading-snug">
                      {audit.metadata.title}
                    </p>
                    <p className="font-mono text-xs text-zinc-600 mt-0.5">
                      {audit.metadata.channel ?? "Text"} · {date}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(audit.id, e)}
                    className="font-mono text-xs text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 px-1 py-0.5"
                    title="Delete this audit"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Clear all */}
        {audits.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
            <button
              onClick={handleClearAll}
              className="w-full font-mono text-xs text-red-500 hover:text-red-400 transition-colors border border-red-900/50 hover:border-red-700/50 rounded-lg py-2"
            >
              Clear all ({audits.length})
            </button>
          </div>
        )}
      </div>
    </>
  );
}
