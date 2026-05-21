import type { Claim } from "@/lib/schema";

const ALLOWED_FLAGS = new Set([
  "Filler",
  "Repetition",
  "Sales_Pitch",
  "Survivorship_Bias",
  "Cherry_Picked",
  "Contradicts_Earlier_Point",
]);

const SUBSTANTIATION_COLORS: Record<string, { bg: string; text: string }> = {
  Sourced:     { bg: "#4ADE80", text: "#0d0d0d" },
  Specific:    { bg: "#8BC34A", text: "#0d0d0d" },
  Vague:       { bg: "#F5A623", text: "#0d0d0d" },
  Anecdotal:   { bg: "#FF8800", text: "#0d0d0d" },
  Unsupported: { bg: "#FF4444", text: "#ffffff" },
};

export default function BadgeStack({ claim }: { claim: Claim }) {
  const sub = SUBSTANTIATION_COLORS[claim.substantiation] ?? { bg: "#52525b", text: "#f0f0f0" };
  const validFlags = claim.pattern_flags.filter((f) => ALLOWED_FLAGS.has(f));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span
        className="px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-widest"
        style={{ backgroundColor: sub.bg, color: sub.text }}
      >
        {claim.substantiation}
      </span>

      <span className="px-3 py-1 rounded-full font-mono text-xs uppercase tracking-widest bg-zinc-700/60 text-zinc-300 border border-zinc-600">
        {claim.claim_type.replace(/_/g, " ")}
      </span>

      {validFlags.map((flag) => (
        <span
          key={flag}
          className="px-2 py-0.5 rounded-full font-mono text-xs uppercase tracking-widest border border-red-500/60 text-red-400"
        >
          {flag.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
