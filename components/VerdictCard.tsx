import type { Audit } from "@/lib/schema";
import { formatTimestamp } from "@/lib/timestamp";

const WATCH_COLORS: Record<string, string> = {
  skip:  "#FF4444",
  skim:  "#F5A623",
  watch: "#4ADE80",
};

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="px-3 py-1 rounded-full font-mono text-xs border border-zinc-700 text-zinc-400 uppercase tracking-widest">
      {label}:{" "}
      <span className="text-zinc-200">{value.replace(/_/g, " ")}</span>
    </span>
  );
}

export default function VerdictCard({ audit }: { audit: Audit }) {
  const { video, metadata, id } = audit;
  const watchColor = WATCH_COLORS[video.worth_watching] ?? "#f0f0f0";
  const duration = formatTimestamp(metadata.durationSeconds);

  return (
    <div
      className="w-full rounded-xl border p-6 flex flex-col gap-5"
      style={{ backgroundColor: "#0D0D1A", borderColor: "#1A1A2E" }}
    >
      {/* Video metadata row */}
      <div className="flex gap-4 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          className="w-36 h-auto rounded-lg object-cover flex-shrink-0 border border-zinc-800"
        />
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className="font-display leading-tight tracking-wide"
            style={{ fontSize: "1.25rem", color: "#f59e0b" }}
          >
            {metadata.title}
          </p>
          <p className="font-mono text-xs text-zinc-400">
            {metadata.channel} · {duration}
          </p>
          {video.extracted_topic !== metadata.title && (
            <p className="font-mono text-xs text-zinc-600 mt-1 leading-relaxed line-clamp-2">
              {video.extracted_topic}
            </p>
          )}
        </div>
      </div>

      {/* Verdict hero row */}
      <div className="flex items-baseline gap-4 flex-wrap">
        <span
          className="font-display tracking-widest leading-none"
          style={{ fontSize: "3.5rem", color: watchColor }}
        >
          {video.worth_watching.toUpperCase()}
        </span>
        <span className="font-mono text-sm text-zinc-500">
          Saved you {video.time_saved_minutes} min
        </span>
      </div>

      {/* One-sentence verdict */}
      <p
        className="font-display text-foreground leading-tight tracking-wide"
        style={{ fontSize: "1.6rem" }}
      >
        {video.verdict}
      </p>

      {/* Summary */}
      <p className="font-mono text-sm text-zinc-300 leading-relaxed">
        {video.summary}
      </p>

      {/* Meta badges */}
      <div className="flex gap-2 flex-wrap">
        <MetaBadge label="Padding"     value={video.padding_ratio} />
        <MetaBadge label="Motive"      value={video.monetization_motive} />
        <MetaBadge label="Credibility" value={video.overall_credibility} />
      </div>
    </div>
  );
}
