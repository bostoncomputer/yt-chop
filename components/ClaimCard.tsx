"use client";

import type { Claim, Verification, SourceType } from "@/lib/schema";
import BadgeStack from "@/components/BadgeStack";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import VerifyButton from "@/components/VerifyButton";
import VerifyResult from "@/components/VerifyResult";
import { parseTimestamp } from "@/lib/timestamp";

interface Props {
  claim: Claim;
  index: number;
  videoId: string;
  sourceType?: SourceType;
  isEmbedOpen: boolean;
  onEmbedOpen: () => void;
  onEmbedClose: () => void;
  verification?: Verification;
  onVerified: (v: Verification) => void;
  onCostAdded?: (cost: number) => void;
}

export default function ClaimCard({
  claim,
  index,
  videoId,
  sourceType,
  isEmbedOpen,
  onEmbedOpen,
  onEmbedClose,
  verification,
  onVerified,
  onCostAdded,
}: Props) {
  const startSeconds = parseTimestamp(claim.timestamp_start);
  const endSeconds = parseTimestamp(claim.timestamp_end);
  const claimNum = String(index + 1).padStart(2, "0");
  const isText = sourceType === "text";

  return (
    <div
      className="w-full rounded-xl border flex flex-col gap-4"
      style={{ backgroundColor: "#171717", borderColor: "#27272a", padding: "24px" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "rgba(245,158,11,0.5)" }}
        >
          Claim {claimNum}
        </span>
        <h3
          className="font-display text-foreground leading-tight tracking-wide"
          style={{ fontSize: "1.5rem", lineHeight: 1.15 }}
        >
          {claim.title}
        </h3>
      </div>

      {/* Explanation */}
      <p className="font-mono text-sm text-zinc-300 leading-relaxed">{claim.explanation}</p>

      {/* Badges */}
      <BadgeStack claim={claim} />

      {/* Source citation */}
      {claim.source_cited && (
        <p className="font-mono text-xs text-zinc-500">
          Source cited: <span className="text-zinc-400">{claim.source_cited}</span>
        </p>
      )}

      {/* Bottom row: timestamp ← → verify */}
      <div className="flex items-center justify-between mt-1">
        {isText ? (
          <span className="font-mono text-xs text-zinc-600 border border-zinc-800 rounded-lg px-3 py-1.5">
            {claim.timestamp_start} – {claim.timestamp_end}
          </span>
        ) : (
          <button
            onClick={isEmbedOpen ? onEmbedClose : onEmbedOpen}
            className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-1.5"
          >
            🎬 {claim.timestamp_start} – {claim.timestamp_end}
          </button>
        )}

        <VerifyButton
          claim={claim}
          onVerified={onVerified}
          existingVerification={verification}
          onCostAdded={onCostAdded}
        />
      </div>

      {/* Inline YouTube embed — only for video source */}
      {!isText && isEmbedOpen && (
        <YouTubeEmbed
          videoId={videoId}
          startSeconds={startSeconds}
          endSeconds={endSeconds}
          onClose={onEmbedClose}
        />
      )}

      {/* Verification result */}
      {verification && <VerifyResult verification={verification} />}
    </div>
  );
}
