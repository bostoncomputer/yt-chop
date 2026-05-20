"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import type { TranscriptResult } from "@/lib/transcript";

interface ResultData {
  videoId: string;
  metadata: TranscriptResult["metadata"];
  transcript: TranscriptResult["transcript"];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Home() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleResult(data: ResultData | null | undefined, err?: string) {
    if (data) {
      setResult(data);
      setError(null);
    } else {
      setResult(null);
      setError(err ?? "Something went wrong");
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen px-4 py-16 gap-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-7xl text-amber-400 tracking-widest leading-none">
          YT CHOP
        </h1>
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
          Transcript Extractor — Phase 1
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-2xl">
        <UrlInput onResult={handleResult} />
      </div>

      {/* Error state */}
      {error && (
        <div className="w-full max-w-2xl p-4 rounded-lg border border-red-800 bg-red-950/30">
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* Metadata card */}
          <div className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col gap-2">
            <h2 className="font-display text-2xl text-amber-400 tracking-wide leading-tight">
              {result.metadata.title}
            </h2>
            <div className="flex gap-6 font-mono text-xs text-zinc-400">
              <span>{result.metadata.channel}</span>
              <span className="text-zinc-600">|</span>
              <span>{formatDuration(result.metadata.durationSeconds)}</span>
              <span className="text-zinc-600">|</span>
              <span>{result.transcript.length} segments</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-600">id: {result.videoId}</span>
            </div>
          </div>

          {/* Transcript */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                Raw Transcript
              </span>
            </div>
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-zinc-800/50">
              {result.transcript.map((seg, i) => (
                <div
                  key={i}
                  className="flex gap-4 px-4 py-2 hover:bg-zinc-800/30 transition-colors"
                >
                  <span className="font-mono text-xs text-amber-500/70 shrink-0 w-12 pt-0.5">
                    {formatTime(seg.start)}
                  </span>
                  <p className="font-mono text-sm text-zinc-300 leading-relaxed">
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
