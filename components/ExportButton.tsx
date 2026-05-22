"use client";

import type { Audit } from "@/lib/schema";
import { exportAudit } from "@/lib/export";

interface Props {
  audit: Audit | null;
}

export default function ExportButton({ audit }: Props) {
  function handleExport() {
    if (!audit) return;
    const content = exportAudit(audit);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ytchop_${audit.id}_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={!audit}
      className="font-mono text-xs text-zinc-400 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-zinc-700 hover:border-amber-400/50 rounded-lg px-3 py-1.5"
      title="Export audit as .txt"
    >
      ↓ Export
    </button>
  );
}
