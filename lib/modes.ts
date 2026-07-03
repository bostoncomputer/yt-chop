import type { ExtractionMode } from "./schema";

export interface ModeEntry {
  id: ExtractionMode;
  label: string;
  description: string;
  defaultOn: boolean;
  promptKey: string;
}

export const MODES: ModeEntry[] = [
  {
    id: "claims",
    label: "Claims Audit",
    description: "Extract and audit every discrete claim, tactic, or recommendation with structural quality scores.",
    defaultOn: true,
    promptKey: "claims",
  },
  {
    id: "tldr",
    label: "TL;DR",
    description: "3–6 key takeaways and a one-line summary of what the content actually covers.",
    defaultOn: false,
    promptKey: "tldr",
  },
  {
    id: "trades",
    label: "Trades Eval",
    description: "Extract every trade idea / ticker and audit thesis quality structurally. Not financial advice.",
    defaultOn: false,
    promptKey: "trades",
  },
];
