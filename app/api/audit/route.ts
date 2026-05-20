import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { AUDIT_PROMPT } from "@/lib/prompts";
import type { Audit, Claim } from "@/lib/schema";
import type { TranscriptSegment } from "@/lib/transcript";

export const runtime = "edge";

function toMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => `[${toMMSS(seg.start)}] ${seg.text}`)
    .join("\n");
}

function extractJson(raw: string): string {
  // Find first { or [ and last } or ] — robust against leading/trailing fences or prose
  const start = raw.search(/[{[]/);
  if (start === -1) return raw;
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return end > start ? raw.slice(start, end + 1) : raw.slice(start);
}

// Explicit JSON template appended to user message so Haiku matches the schema.
// System prompt (AUDIT_PROMPT) is spec-locked and not modified.
const JSON_SCHEMA_TEMPLATE = `

Respond with ONLY this JSON structure, no other text:
{
  "video": {
    "extracted_topic": "string",
    "verdict": "one punchy sentence",
    "summary": "2-3 sentence synthesis",
    "padding_ratio": "low|medium|high",
    "monetization_motive": "none|soft|hard",
    "overall_credibility": "high|mixed|low",
    "time_saved_minutes": 0,
    "worth_watching": "skip|skim|watch"
  },
  "claims": [
    {
      "id": "claim_1",
      "title": "plain English ~8-10 words",
      "explanation": "2-3 sentences direct register",
      "timestamp_start": "MM:SS",
      "timestamp_end": "MM:SS",
      "claim_type": "Tactic|Statistic|Anecdote|Opinion|Framework|Case_Study",
      "substantiation": "Sourced|Specific|Vague|Anecdotal|Unsupported",
      "source_cited": "string or null",
      "pattern_flags": [],
      "verifiable_assertions": []
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, url, metadata, transcript } = body as {
      videoId: string;
      url: string;
      metadata: Audit["metadata"];
      transcript: TranscriptSegment[];
    };

    if (!metadata || !transcript?.length) {
      return NextResponse.json(
        { ok: false, error: "Missing metadata or transcript" },
        { status: 400 }
      );
    }

    const userMessage =
      `Video: ${metadata.title}\nChannel: ${metadata.channel}\nDuration: ${metadata.durationSeconds}s\n\nTRANSCRIPT:\n${formatTranscript(transcript)}` +
      JSON_SCHEMA_TEMPLATE;

    const content = await callClaude({
      model: "claude-haiku-4-5-20251001",
      system: AUDIT_PROMPT,
      user: userMessage,
      max_tokens: 8192,
    });

    const textBlock = content.find((b) => b.type === "text");
    if (!textBlock?.text) throw new Error("No text response from Claude");

    let parsed: { video: Audit["video"]; claims: Claim[] };
    try {
      parsed = JSON.parse(extractJson(textBlock.text));
    } catch {
      throw new Error(`Failed to parse audit JSON: ${textBlock.text.slice(0, 300)}`);
    }

    if (!parsed.video || !Array.isArray(parsed.claims)) {
      throw new Error(
        `Audit JSON missing video/claims. Keys: ${Object.keys(parsed).join(", ")}. Raw: ${textBlock.text.slice(0, 300)}`
      );
    }

    const audit: Audit = {
      id: videoId ?? "",
      url: url ?? "",
      fetchedAt: new Date().toISOString(),
      metadata,
      video: parsed.video,
      claims: parsed.claims,
      verifications: {},
    };

    return NextResponse.json({ ok: true, data: audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const lower = message.toLowerCase();
    let status = 500;
    if (lower.includes("api key") || lower.includes("api error 401")) status = 401;
    else if (lower.includes("api error 429")) status = 429;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
