import type { Audit, Verification } from "@/lib/schema";
import { parseTimestamp } from "@/lib/timestamp";

const HOLDS_UP_LABEL: Record<string, string> = {
  yes: "Holds Up",
  partially: "Partially",
  no: "Doesn't Hold Up",
  inconclusive: "Inconclusive",
};

// ── Section renderers ────────────────────────────────────────────────────────

function renderTldr(
  data: { takeaways: string[]; one_line: string }
): string[] {
  const lines: string[] = [];
  lines.push("## TL;DR");
  lines.push("");
  lines.push(data.one_line);
  lines.push("");
  for (const t of data.takeaways) {
    lines.push(`- ${t}`);
  }
  lines.push("");
  return lines;
}

function renderTrades(
  data: {
    trades: Array<{
      ticker: string;
      company: string;
      direction: string;
      thesis: string;
      entry: string | null;
      target: string | null;
      stop: string | null;
      timeframe: string | null;
      position_disclosure: string;
      quality_flags: string[];
      timestamp: string;
    }>;
    disclaimer: string;
    overall_read: string;
  },
  auditId: string,
  isVideo: boolean
): string[] {
  const lines: string[] = [];
  lines.push("## Trades Eval");
  lines.push("");
  lines.push(`Content quality: ${data.overall_read.toUpperCase()}`);
  lines.push("");
  lines.push(`⚠ ${data.disclaimer}`);
  lines.push("");

  if (data.trades.length === 0) {
    lines.push("No trade ideas found in content.");
    lines.push("");
    return lines;
  }

  for (const trade of data.trades) {
    lines.push(`### ${trade.ticker} — ${trade.direction.toUpperCase()} — ${trade.company}`);
    lines.push("");
    lines.push(trade.thesis);
    lines.push("");

    const levels: string[] = [];
    if (trade.entry)     levels.push(`Entry: ${trade.entry}`);
    if (trade.target)    levels.push(`Target: ${trade.target}`);
    if (trade.stop)      levels.push(`Stop: ${trade.stop}`);
    if (trade.timeframe) levels.push(`Timeframe: ${trade.timeframe}`);
    if (levels.length > 0) {
      lines.push(levels.join(" · "));
    }

    if (trade.position_disclosure !== "none_stated") {
      lines.push(
        `Position: ${trade.position_disclosure === "disclosed" ? "Disclosed" : "NOT DISCLOSED"}`
      );
    }

    if (trade.quality_flags.length > 0) {
      lines.push(`Flags: ${trade.quality_flags.join(", ")}`);
    }

    const startSec = parseTimestamp(trade.timestamp);
    if (isVideo && auditId) {
      lines.push(
        `Timestamp: ${trade.timestamp} — https://youtu.be/${auditId}?t=${startSec}`
      );
    } else {
      lines.push(`Timestamp: ${trade.timestamp}`);
    }

    lines.push("");
  }

  return lines;
}

// ── Main export ──────────────────────────────────────────────────────────────

export function exportAudit(audit: Audit): string {
  const { video, metadata, id, claims, verifications, outputs, sourceType } = audit;
  const isVideo = sourceType !== "text";
  const lines: string[] = [];

  // H1 header (unchanged)
  lines.push(`# ${metadata.title} — ${metadata.channel ?? "Text passage"}`);
  lines.push("");

  // TL;DR section
  const tldr = outputs?.tldr as { takeaways: string[]; one_line: string } | undefined;
  if (tldr?.takeaways && tldr.one_line) {
    lines.push(...renderTldr(tldr));
  }

  // Verdict + claims (existing behaviour, unchanged)
  if (video) {
    lines.push("## Verdict");
    lines.push(`**${video.worth_watching.toUpperCase()}** · Saved you ${video.time_saved_minutes} min`);
    lines.push("");
    lines.push(video.verdict);
    lines.push("");
    lines.push(video.summary);
    lines.push("");
    lines.push(
      `**[Padding: ${video.padding_ratio}]** **[Motive: ${video.monetization_motive}]** **[Credibility: ${video.overall_credibility}]**`
    );
    lines.push("");
  }

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const v: Verification | undefined = verifications[claim.id];
    const n = String(i + 1).padStart(2, "0");

    lines.push(`## Claim ${n}: ${claim.title}`);
    lines.push("");

    const badges = [
      `**[Type: ${claim.claim_type}]**`,
      `**[Substantiation: ${claim.substantiation}]**`,
      ...(claim.pattern_flags.length > 0
        ? [`**[Flags: ${claim.pattern_flags.join(", ")}]**`]
        : []),
    ];
    lines.push(badges.join(" "));
    lines.push("");

    lines.push(claim.explanation);
    lines.push("");

    const startSec = parseTimestamp(claim.timestamp_start);
    if (isVideo && id) {
      const link = `https://youtu.be/${id}?t=${startSec}`;
      lines.push(`Source: ${claim.timestamp_start}–${claim.timestamp_end} — ${link}`);
    } else {
      lines.push(`Timestamp: ${claim.timestamp_start}–${claim.timestamp_end}`);
    }
    if (claim.source_cited) {
      lines.push(`Source cited: ${claim.source_cited}`);
    }
    lines.push("");

    if (v) {
      lines.push("### Verified");
      lines.push(`**${HOLDS_UP_LABEL[v.holds_up] ?? v.holds_up}** — ${v.one_line}`);
      lines.push("");
      for (const a of v.assertions) {
        lines.push(`- **${a.verdict}**: ${a.assertion}`);
        lines.push(`  ${a.evidence}`);
        if (a.sources.length > 0) {
          lines.push(`  Sources: ${a.sources.join(", ")}`);
        }
      }
      lines.push("");
    }
  }

  // Trades section
  const trades = outputs?.trades as Parameters<typeof renderTrades>[0] | undefined;
  if (trades?.trades && trades.disclaimer && trades.overall_read) {
    lines.push(...renderTrades(trades, id, isVideo));
  }

  return lines.join("\n");
}
