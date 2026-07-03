export type ExtractionMode =
  | "claims"
  | "tldr"
  | "clean_transcript"
  | "action_checklist"
  | "trades"
  | "predictions";

export type SourceType = "video" | "text";

export type Audit = {
  id: string;
  url: string;
  fetchedAt: string;
  metadata: {
    title: string;
    channel: string | null;
    durationSeconds: number | null;
  };
  video?: {
    extracted_topic: string;
    verdict: string;
    summary: string;
    padding_ratio: "low" | "medium" | "high";
    monetization_motive: "none" | "soft" | "hard";
    overall_credibility: "high" | "mixed" | "low";
    time_saved_minutes: number;
    worth_watching: "skip" | "skim" | "watch";
  };
  claims: Claim[];
  verifications: { [claimId: string]: Verification };
  outputs?: Partial<Record<ExtractionMode, unknown>>;
  sourceType?: SourceType;
};

export type Claim = {
  id: string;
  title: string;
  explanation: string;
  timestamp_start: string;
  timestamp_end: string;
  claim_type: "Tactic" | "Statistic" | "Anecdote" | "Opinion" | "Framework" | "Case_Study";
  substantiation: "Sourced" | "Specific" | "Vague" | "Anecdotal" | "Unsupported";
  source_cited: string | null;
  pattern_flags: string[];
  verifiable_assertions: string[];
};

export type Verification = {
  claim_id: string;
  verifiedAt: string;
  assertions: Array<{
    assertion: string;
    verdict: "Confirmed" | "Disputed" | "Mixed" | "Inconclusive" | "Outdated";
    evidence: string;
    sources: string[];
  }>;
  holds_up: "yes" | "partially" | "no" | "inconclusive";
  one_line: string;
};
