import type { Verification } from "@/lib/schema";

const HOLDS_UP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  yes:          { bg: "#4ADE80", text: "#0d0d0d", label: "Holds Up" },
  partially:    { bg: "#F5A623", text: "#0d0d0d", label: "Partially" },
  no:           { bg: "#FF4444", text: "#ffffff", label: "Doesn't Hold Up" },
  inconclusive: { bg: "#6B6B8A", text: "#f0f0f0", label: "Inconclusive" },
};

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  Confirmed:    { bg: "#4ADE80", text: "#0d0d0d" },
  Disputed:     { bg: "#FF4444", text: "#ffffff" },
  Mixed:        { bg: "#F5A623", text: "#0d0d0d" },
  Inconclusive: { bg: "#6B6B8A", text: "#f0f0f0" },
  Outdated:     { bg: "#FF8800", text: "#0d0d0d" },
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

export default function VerifyResult({ verification }: { verification: Verification }) {
  const hu = HOLDS_UP_COLORS[verification.holds_up] ?? HOLDS_UP_COLORS.inconclusive;

  return (
    <div
      className="rounded-lg flex flex-col gap-3 p-4"
      style={{
        backgroundColor: "#0f0f16",
        borderLeft: `3px solid ${hu.bg}`,
        borderTop: "1px solid #1e1e2a",
        borderRight: "1px solid #1e1e2a",
        borderBottom: "1px solid #1e1e2a",
        borderRadius: "0 8px 8px 0",
      }}
    >
      {/* holds_up + one-liner */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-widest flex-shrink-0"
          style={{ backgroundColor: hu.bg, color: hu.text }}
        >
          {hu.label}
        </span>
        <p
          className="font-display text-foreground leading-tight tracking-wide"
          style={{ fontSize: "1.1rem" }}
        >
          {verification.one_line}
        </p>
      </div>

      {/* Assertion sub-cards */}
      {verification.assertions.length > 0 && (
        <div className="flex flex-col gap-2">
          {verification.assertions.map((a, i) => {
            const vc = VERDICT_COLORS[a.verdict] ?? VERDICT_COLORS.Inconclusive;
            return (
              <div
                key={i}
                className="rounded-lg p-3 flex flex-col gap-1.5"
                style={{ backgroundColor: "#171720", border: "1px solid #27272a" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full font-mono text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                    style={{ backgroundColor: vc.bg, color: vc.text }}
                  >
                    {a.verdict}
                  </span>
                  <p className="font-mono text-xs text-zinc-200 leading-snug">{a.assertion}</p>
                </div>

                <p className="font-mono text-xs text-zinc-500 leading-relaxed">{a.evidence}</p>

                {a.sources.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                    {a.sources.map((url, si) => (
                      <a
                        key={si}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
                      >
                        {domainOf(url)}
                      </a>
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
