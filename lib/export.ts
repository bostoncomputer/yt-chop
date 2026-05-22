import type { Audit, Verification } from "@/lib/schema";
import { parseTimestamp } from "@/lib/timestamp";

const HOLDS_UP_LABEL: Record<string, string> = {
  yes: "Holds Up",
  partially: "Partially",
  no: "Doesn't Hold Up",
  inconclusive: "Inconclusive",
};

export function exportAudit(audit: Audit): string {
  const { video, metadata, id, claims, verifications } = audit;
  const lines: string[] = [];

  lines.push(`# ${metadata.title} — ${metadata.channel}`);
  lines.push("");
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
    const link = `https://youtu.be/${id}?t=${startSec}`;
    lines.push(`Source: ${claim.timestamp_start}–${claim.timestamp_end} — ${link}`);
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

  return lines.join("\n");
}
