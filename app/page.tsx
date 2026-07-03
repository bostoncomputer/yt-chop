"use client";

import { useEffect, useRef, useState } from "react";
import UrlInput from "@/components/UrlInput";
import VerdictCard from "@/components/VerdictCard";
import ClaimCard from "@/components/ClaimCard";
import TldrCard from "@/components/TldrCard";
import TradesCard, { type TradesData } from "@/components/TradesCard";
import ModeSelector from "@/components/ModeSelector";
import ExportButton from "@/components/ExportButton";
import HistoryDrawer from "@/components/HistoryDrawer";
import { saveAudit, loadAudit } from "@/lib/storage";
import { MODES } from "@/lib/modes";
import { costFromUsage } from "@/lib/pricing";
import type { TranscriptSegment } from "@/lib/transcript";
import type { Audit, Claim, ExtractionMode, SourceType, Verification } from "@/lib/schema";

interface ResolvedInput {
  videoId: string;
  url: string;
  metadata: Audit["metadata"];
  transcript: TranscriptSegment[] | string;
  sourceType: SourceType;
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

const DEFAULT_MODES = new Set(
  MODES.filter((m) => m.defaultOn).map((m) => m.id as ExtractionMode)
);

export default function Home() {
  // Input tab
  const [inputTab, setInputTab] = useState<"youtube" | "text">("youtube");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [fetchPhase, setFetchPhase] = useState<"idle" | "fetching">("idle");

  // Resolved input (after fetch or paste submit)
  const [resolvedInput, setResolvedInput] = useState<ResolvedInput | null>(null);

  // Mode selection & run state
  const [selectedModes, setSelectedModes] = useState<Set<ExtractionMode>>(
    new Set(DEFAULT_MODES)
  );
  const [runningMode, setRunningMode] = useState<ExtractionMode | null>(null);

  // Results
  const [audit, setAudit] = useState<Audit | null>(null);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Audit["verifications"]>({});
  const [sessionCost, setSessionCost] = useState<number>(0);

  // Other
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Stable ref so sequential run loop always reads latest audit
  const auditRef = useRef<Audit | null>(null);
  auditRef.current = audit;

  // Load audit from ?v= query param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    if (v) {
      const stored = loadAudit(v);
      if (stored) {
        setAudit(stored);
        setVerifications(stored.verifications ?? {});
      }
    }
  }, []);

  function handleVerified(v: Verification) {
    setVerifications((prev) => {
      const updated = { ...prev, [v.claim_id]: v };
      const cur = auditRef.current;
      if (cur) saveAudit({ ...cur, verifications: updated });
      return updated;
    });
  }

  function handleCostAdded(cost: number) {
    setSessionCost((prev) => prev + cost);
  }

  // --- YouTube tab ---
  async function handleYouTubeSubmit(url: string) {
    setError(null);
    setResolvedInput(null);
    setAudit(null);
    setOpenClaimId(null);
    setVerifications({});
    setSessionCost(0);

    setFetchPhase("fetching");
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "Transcript fetch failed");
      const { videoId, metadata, transcript } = json.data as {
        videoId: string;
        metadata: Audit["metadata"];
        transcript: TranscriptSegment[];
      };
      setResolvedInput({ videoId, url, metadata, transcript, sourceType: "video" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcript fetch failed");
    } finally {
      setFetchPhase("idle");
    }
  }

  // --- Paste text tab ---
  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pasteText.trim()) return;
    setError(null);
    setAudit(null);
    setOpenClaimId(null);
    setVerifications({});
    setSessionCost(0);
    setResolvedInput({
      videoId: "",
      url: "",
      metadata: {
        title: pasteTitle.trim() || "Pasted text",
        channel: null,
        durationSeconds: null,
      },
      transcript: pasteText,
      sourceType: "text",
    });
  }

  // --- Run extraction ---
  async function handleRun() {
    if (!resolvedInput) return;
    const modesInOrder = MODES.filter((m) => selectedModes.has(m.id));
    if (!modesInOrder.length) return;

    setError(null);
    const auditId = resolvedInput.videoId || `paste-${Date.now()}`;

    for (const mode of modesInOrder) {
      setRunningMode(mode.id);
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: mode.id,
            metadata: resolvedInput.metadata,
            transcript: resolvedInput.transcript,
            sourceType: resolvedInput.sourceType,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? `${mode.label} failed`);

        if (json.usage) {
          setSessionCost((prev) => prev + costFromUsage(json.usage));
        }

        const prev = auditRef.current;

        let next: Audit;
        if (mode.id === "claims") {
          const d = json.data as { video: NonNullable<Audit["video"]>; claims: Claim[] };
          next = {
            id: auditId,
            url: resolvedInput.url,
            fetchedAt: new Date().toISOString(),
            metadata: resolvedInput.metadata,
            video: d.video,
            claims: d.claims,
            verifications: prev?.verifications ?? {},
            outputs: prev?.outputs,
            sourceType: resolvedInput.sourceType,
          };
        } else {
          next = {
            id: auditId,
            url: resolvedInput.url,
            fetchedAt: prev?.fetchedAt ?? new Date().toISOString(),
            metadata: resolvedInput.metadata,
            video: prev?.video,
            claims: prev?.claims ?? [],
            verifications: prev?.verifications ?? {},
            outputs: { ...prev?.outputs, [mode.id]: json.data },
            sourceType: resolvedInput.sourceType,
          };
        }

        auditRef.current = next;
        setAudit(next);
        saveAudit(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : `${mode.label} failed`);
      }
    }

    setRunningMode(null);
  }

  const isRunning = runningMode !== null;
  const isFetching = fetchPhase === "fetching";
  const auditWithVerifications = audit ? { ...audit, verifications } : null;
  const tldrData = audit?.outputs?.tldr as
    | { takeaways: string[]; one_line: string }
    | undefined;
  const tradesData = audit?.outputs?.trades as TradesData | undefined;

  return (
    <main className="flex flex-col items-center min-h-screen px-4 py-16 gap-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-7xl text-amber-400 tracking-widest leading-none">
          YT CHOP
        </h1>
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
          AI Audit — v1.1
        </p>
        <div className="flex items-center gap-2 mt-2">
          <ExportButton audit={auditWithVerifications} />
          <button
            onClick={() => setHistoryOpen(true)}
            className="font-mono text-xs text-zinc-400 hover:text-amber-400 transition-colors border border-zinc-700 hover:border-amber-400/50 rounded-lg px-3 py-1.5"
            title="View audit history"
          >
            ☰ History
          </button>
        </div>
      </div>

      {/* Input section */}
      <div className="w-full max-w-2xl flex flex-col gap-4">
        {/* Tab switch */}
        <div className="flex gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-900/40 w-fit">
          {(["youtube", "text"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setInputTab(tab);
                setResolvedInput(null);
                setError(null);
              }}
              disabled={isFetching || isRunning}
              className={`font-mono text-xs px-4 py-1.5 rounded-md transition-colors ${
                inputTab === tab
                  ? "bg-amber-400 text-black"
                  : "text-zinc-400 hover:text-zinc-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tab === "youtube" ? "YouTube" : "Paste Text"}
            </button>
          ))}
        </div>

        {/* YouTube tab */}
        {inputTab === "youtube" && (
          <UrlInput
            onSubmit={handleYouTubeSubmit}
            loading={isFetching}
            loadingLabel="Fetching…"
          />
        )}

        {/* Paste text tab */}
        {inputTab === "text" && (
          <form onSubmit={handlePasteSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title (optional)"
              disabled={isRunning}
              className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors disabled:opacity-50"
              spellCheck={false}
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste article, transcript, or any text…"
              disabled={isRunning}
              rows={6}
              className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors resize-y disabled:opacity-50"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!pasteText.trim() || isRunning}
              className="self-end px-6 py-3 rounded-lg bg-amber-400 text-black font-display text-sm tracking-widest uppercase hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Use this text
            </button>
          </form>
        )}

        {/* Fetching indicator */}
        {isFetching && (
          <p className="font-mono text-xs text-amber-400/70 tracking-widest uppercase animate-pulse">
            Fetching transcript…
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl p-4 rounded-lg border border-red-800 bg-red-950/30">
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resolved input: metadata preview + mode selector + run */}
      {resolvedInput && (
        <div className="w-full max-w-2xl flex flex-col gap-4">
          {/* Metadata preview */}
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 flex flex-col gap-1">
            <p className="font-display text-lg text-amber-400 tracking-wide leading-tight">
              {resolvedInput.metadata.title}
            </p>
            <p className="font-mono text-xs text-zinc-500">
              {resolvedInput.sourceType === "video"
                ? `${resolvedInput.metadata.channel} · ${formatDuration(resolvedInput.metadata.durationSeconds)}`
                : "Text passage"}
            </p>
          </div>

          {/* Mode selector */}
          <ModeSelector
            selected={selectedModes}
            onChange={setSelectedModes}
            runningMode={runningMode}
          />

          {/* Run button + cost */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleRun}
              disabled={isRunning || selectedModes.size === 0}
              className="px-8 py-3 rounded-lg bg-amber-400 text-black font-display text-sm tracking-widest uppercase hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? "Running…" : "Run"}
            </button>

            {sessionCost > 0 && (
              <span className="font-mono text-xs text-zinc-500">
                ≈ ${sessionCost.toFixed(2)} session
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card output */}
      {audit && (
        <div className="w-full max-w-3xl flex flex-col gap-5">
          {/* TL;DR card */}
          {tldrData && <TldrCard data={tldrData} />}

          {/* Trades eval card */}
          {tradesData && (
            <TradesCard
              data={tradesData}
              videoId={audit.id}
              sourceType={audit.sourceType}
            />
          )}

          {/* Verdict card (only when claims ran) */}
          {audit.video && <VerdictCard audit={{ ...audit, verifications }} />}

          {/* Claims */}
          {audit.claims.length > 0 && (
            <>
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
                  sourceType={audit.sourceType}
                  isEmbedOpen={openClaimId === claim.id}
                  onEmbedOpen={() => setOpenClaimId(claim.id)}
                  onEmbedClose={() => setOpenClaimId(null)}
                  verification={verifications[claim.id]}
                  onVerified={handleVerified}
                  onCostAdded={handleCostAdded}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* History drawer */}
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </main>
  );
}
