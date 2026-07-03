"use client";

import { parseTimestamp } from "@/lib/timestamp";
import type { SourceType } from "@/lib/schema";

const ALLOWED_QUALITY_FLAGS = new Set([
  "No_Thesis",
  "No_Timeframe",
  "No_Risk_Level",
  "Hype_Language",
  "Position_Undisclosed",
  "Unfalsifiable",
]);

const DIRECTION_STYLE: Record<string, { label: string; color: string }> = {
  long:    { label: "LONG",    color: "#4ADE80" },
  short:   { label: "SHORT",   color: "#FF4444" },
  unclear: { label: "UNCLEAR", color: "#71717a" },
};

const OVERALL_READ_STYLE: Record<string, { label: string; color: string }> = {
  viable: { label: "VIABLE", color: "#4ADE80" },
  mixed:  { label: "MIXED",  color: "#F5A623" },
  hype:   { label: "HYPE",   color: "#FF4444" },
};

export interface TradeIdea {
  ticker: string;
  company: string;
  direction: "long" | "short" | "unclear";
  thesis: string;
  entry: string | null;
  target: string | null;
  stop: string | null;
  timeframe: string | null;
  position_disclosure: "disclosed" | "undisclosed" | "none_stated";
  quality_flags: string[];
  timestamp: string;
}

export interface TradesData {
  trades: TradeIdea[];
  disclaimer: string;
  overall_read: "viable" | "mixed" | "hype";
}

interface Props {
  data: TradesData;
  videoId: string;
  sourceType?: SourceType;
}

function TimestampBadge({
  ts,
  videoId,
  sourceType,
}: {
  ts: string;
  videoId: string;
  sourceType?: SourceType;
}) {
  const isText = sourceType === "text" || !videoId;
  if (isText) {
    return (
      <span className="font-mono text-xs text-zinc-600 border border-zinc-800 rounded px-2 py-0.5">
        {ts}
      </span>
    );
  }
  const secs = parseTimestamp(ts);
  return (
    <a
      href={`https://youtu.be/${videoId}?t=${secs}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-400/25 hover:border-amber-400/50 rounded px-2 py-0.5"
    >
      🎬 {ts}
    </a>
  );
}

function DisclosurePill({ value }: { value: TradeIdea["position_disclosure"] }) {
  if (value === "disclosed") {
    return (
      <span className="font-mono text-xs px-2 py-0.5 rounded border border-green-600/40 text-green-500 uppercase tracking-widest">
        Position disclosed
      </span>
    );
  }
  if (value === "undisclosed") {
    return (
      <span className="font-mono text-xs px-2 py-0.5 rounded border border-red-500/60 text-red-400 uppercase tracking-widest">
        Position undisclosed
      </span>
    );
  }
  return null;
}

export default function TradesCard({ data, videoId, sourceType }: Props) {
  const read = OVERALL_READ_STYLE[data.overall_read] ?? OVERALL_READ_STYLE.mixed;

  return (
    <div
      className="w-full rounded-xl border flex flex-col gap-4 p-5"
      style={{ backgroundColor: "#0D0D1A", borderColor: "#1A1A2E" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-xs text-amber-400 uppercase tracking-widest">
          Trades Eval
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500">Content quality:</span>
          <span
            className="font-display tracking-widest"
            style={{ fontSize: "1rem", color: read.color }}
          >
            {read.label}
          </span>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/60">
        <span className="text-zinc-500 font-mono text-xs mt-0.5 shrink-0">⚠</span>
        <p className="font-mono text-xs text-zinc-500 leading-snug">{data.disclaimer}</p>
      </div>

      {/* Trade cards */}
      {data.trades.length === 0 ? (
        <p className="font-mono text-xs text-zinc-600 text-center py-4">
          No trade ideas found in content.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.trades.map((trade, i) => {
            const dir = DIRECTION_STYLE[trade.direction] ?? DIRECTION_STYLE.unclear;
            const validFlags = trade.quality_flags.filter((f) => ALLOWED_QUALITY_FLAGS.has(f));

            return (
              <div
                key={i}
                className="rounded-lg border p-4 flex flex-col gap-3"
                style={{ borderColor: "#27272a", backgroundColor: "#171717" }}
              >
                {/* Ticker row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-display tracking-widest"
                      style={{ fontSize: "1.25rem", color: dir.color }}
                    >
                      {trade.ticker}
                    </span>
                    <span
                      className="font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-widest"
                      style={{ color: dir.color, borderColor: `${dir.color}44` }}
                    >
                      {dir.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{trade.company}</span>
                  </div>
                  <TimestampBadge ts={trade.timestamp} videoId={videoId} sourceType={sourceType} />
                </div>

                {/* Thesis */}
                <p className="font-mono text-sm text-zinc-300 leading-relaxed">{trade.thesis}</p>

                {/* Levels row */}
                {(trade.entry || trade.target || trade.stop || trade.timeframe) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {trade.entry && (
                      <span className="font-mono text-xs text-zinc-400">
                        Entry: <span className="text-zinc-200">{trade.entry}</span>
                      </span>
                    )}
                    {trade.target && (
                      <span className="font-mono text-xs text-zinc-400">
                        Target: <span className="text-green-400">{trade.target}</span>
                      </span>
                    )}
                    {trade.stop && (
                      <span className="font-mono text-xs text-zinc-400">
                        Stop: <span className="text-red-400">{trade.stop}</span>
                      </span>
                    )}
                    {trade.timeframe && (
                      <span className="font-mono text-xs text-zinc-400">
                        Timeframe: <span className="text-zinc-200">{trade.timeframe}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Flags + disclosure */}
                {(validFlags.length > 0 || trade.position_disclosure !== "none_stated") && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <DisclosurePill value={trade.position_disclosure} />
                    {validFlags.map((flag) => (
                      <span
                        key={flag}
                        className="font-mono text-xs px-2 py-0.5 rounded border border-red-500/60 text-red-400 uppercase tracking-widest"
                      >
                        {flag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
