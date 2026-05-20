export type Audit = {
  id: string;                       // YouTube video ID
  url: string;
  fetchedAt: string;                // ISO timestamp
  metadata: {
    title: string;
    channel: string;
    durationSeconds: number;
  };
  video: {
    extracted_topic: string;        // Claude's own framing, not YouTube title
    verdict: string;                // one punchy sentence
    summary: string;                // 2-3 sentences
    padding_ratio: "low" | "medium" | "high";
    monetization_motive: "none" | "soft" | "hard";
    overall_credibility: "high" | "mixed" | "low";
    time_saved_minutes: number;
    worth_watching: "skip" | "skim" | "watch";
  };
  claims: Claim[];
  verifications: { [claimId: string]: Verification };
};

export type Claim = {
  id: string;                       // 'claim_1', 'claim_2'...
  title: string;                    // plain English, ~8-10 words
  explanation: string;              // 2-3 sentences, direct register
  timestamp_start: string;          // 'MM:SS' or 'HH:MM:SS'
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
