"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import VerdictCard from "@/components/VerdictCard";
import ClaimCard from "@/components/ClaimCard";
import type { TranscriptResult } from "@/lib/transcript";
import type { Audit, Verification } from "@/lib/schema";

type Phase = "idle" | "fetching" | "auditing";

interface TranscriptData {
  videoId: string;
  metadata: TranscriptResult["metadata"];
  transcript: TranscriptResult["transcript"];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const LOADING_LABELS: Record<Phase, string> = {
  idle: "",
  fetching: "Fetching…",
  auditing: "Auditing…",
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Audit["verifications"]>({});

  function handleVerified(v: Verification) {
    setVerifications((prev) => ({ ...prev, [v.claim_id]: v }));
  }

  async function handleSubmit(url: string) {
    setError(null);
    setTranscriptData(null);
    setAudit(null);
    setOpenClaimId(null);
    setVerifications({});

    setPhase("fetching");
    let td: TranscriptData;
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "Transcript fetch failed");
      td = json.data as TranscriptData;
      setTranscriptData(td);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcript fetch failed");
      setPhase("idle");
      return;
    }

    setPhase("auditing");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: td.videoId,
          url,
          metadata: td.metadata,
          transcript: td.transcript,
        }),
      });
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "Audit failed");
      setAudit(json.data as Audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setPhase("idle");
    }
  }

  const loading = phase !== "idle";

  return (
    <main className="flex flex-col items-center min-h-screen px-4 py-16 gap-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-7xl text-amber-400 tracking-widest leading-none">
          YT CHOP
        </h1>
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
          AI Audit — Phase 4
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <UrlInput
          onSubmit={handleSubmit}
          loading={loading}
          loadingLabel={LOADING_LABELS[phase]}
        />
        {loading && (
          <p className="font-mono text-xs text-amber-400/70 tracking-widest uppercase animate-pulse">
            {phase === "fetching" ? "Fetching transcript…" : "Auditing claims…"}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl p-4 rounded-lg border border-red-800 bg-red-950/30">
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Transcript metadata while audit loads */}
      {transcriptData && !audit && !error && (
        <div className="w-full max-w-2xl p-5 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col gap-1">
          <h2 className="font-display text-xl text-amber-400 tracking-wide leading-tight">
            {transcriptData.metadata.title}
          </h2>
          <p className="font-mono text-xs text-zinc-400">
            {transcriptData.metadata.channel} ·{" "}
            {formatDuration(transcriptData.metadata.durationSeconds)} ·{" "}
            {transcriptData.transcript.length} segments
          </p>
        </div>
      )}

      {/* Card output */}
      {audit && (
        <div className="w-full max-w-3xl flex flex-col gap-5">
          <VerdictCard audit={audit} />

          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
              {audit.claims.length} claims
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {audit.claims.map((claim, i) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              index={i}
              videoId={audit.id}
              isEmbedOpen={openClaimId === claim.id}
              onEmbedOpen={() => setOpenClaimId(claim.id)}
              onEmbedClose={() => setOpenClaimId(null)}
              verification={verifications[claim.id]}
              onVerified={handleVerified}
            />
          ))}
        </div>
      )}
    </main>
  );
}
