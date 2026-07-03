import { NextRequest, NextResponse } from "next/server";
import { callClaude, type CachedSystemBlock } from "@/lib/anthropic";
import { AUDIT_PROMPT, TLDR_PROMPT, TRADES_PROMPT } from "@/lib/prompts";
import { MODES } from "@/lib/modes";
import { formatTranscript } from "@/lib/format-transcript";
import type { Audit, Claim, ExtractionMode, SourceType } from "@/lib/schema";
import type { TranscriptSegment } from "@/lib/transcript";

export const runtime = "edge";

function extractJson(raw: string): string {
  const start = raw.search(/[{[]/);
  if (start === -1) return raw;
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return end > start ? raw.slice(start, end + 1) : raw.slice(start);
}

const SYSTEM_PROMPTS: Record<string, string> = {
  claims: AUDIT_PROMPT,
  tldr: TLDR_PROMPT,
  trades: TRADES_PROMPT,
};

const JSON_TEMPLATES: Record<string, string> = {
  claims: `

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
}`,
  tldr: `

Respond with ONLY this JSON structure, no other text:
{
  "takeaways": ["string", "string", "string"],
  "one_line": "string"
}`,
  trades: `

Respond with ONLY this JSON structure, no other text:
{
  "trades": [
    {
      "ticker": "AAPL",
      "company": "Apple Inc.",
      "direction": "long|short|unclear",
      "thesis": "the actual reason given, or 'No thesis stated'",
      "entry": "price or condition, or null",
      "target": "price target, or null",
      "stop": "stop-loss level, or null",
      "timeframe": "holding period or catalyst timing, or null",
      "position_disclosure": "disclosed|undisclosed|none_stated",
      "quality_flags": ["No_Thesis", "No_Timeframe", "No_Risk_Level", "Hype_Language", "Position_Undisclosed", "Unfalsifiable"],
      "timestamp": "MM:SS"
    }
  ],
  "disclaimer": "This is structural analysis of content quality, not financial advice.",
  "overall_read": "viable|mixed|hype"
}`,
};

function buildUserMessage(
  mode: ExtractionMode,
  metadata: Audit["metadata"],
  transcript: TranscriptSegment[] | string,
  sourceType: SourceType
): string {
  const body = formatTranscript(transcript);
  const template = JSON_TEMPLATES[mode] ?? "";

  if (sourceType === "text") {
    return (
      `Title: ${metadata.title}\n` +
      `(This is a text passage — use "the text" / "the author" framing, not "the video" / "the speaker")\n\n` +
      `CONTENT:\n${body}` +
      template
    );
  }

  return (
    `Video: ${metadata.title}\nChannel: ${metadata.channel ?? "Unknown"}\nDuration: ${metadata.durationSeconds ?? "unknown"}s\n\n` +
    `TRANSCRIPT:\n${body}` +
    template
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, metadata, transcript, sourceType } = body as {
      mode: ExtractionMode;
      metadata: Audit["metadata"];
      transcript: TranscriptSegment[] | string;
      sourceType: SourceType;
    };

    const modeEntry = MODES.find((m) => m.id === mode);
    if (!modeEntry) {
      return NextResponse.json({ ok: false, error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    const systemPromptText = SYSTEM_PROMPTS[modeEntry.promptKey];
    if (!systemPromptText) {
      return NextResponse.json({ ok: false, error: `No prompt for mode: ${mode}` }, { status: 400 });
    }

    const hasTranscript =
      typeof transcript === "string" ? transcript.trim().length > 0 : transcript?.length > 0;
    if (!metadata || !hasTranscript) {
      return NextResponse.json({ ok: false, error: "Missing metadata or transcript" }, { status: 400 });
    }

    const cachedSystem: CachedSystemBlock = {
      type: "text",
      text: systemPromptText,
      cache_control: { type: "ephemeral" },
    };

    const userMessage = buildUserMessage(mode, metadata, transcript, sourceType);

    const { content, usage } = await callClaude({
      model: "claude-haiku-4-5",
      system: cachedSystem,
      user: userMessage,
      max_tokens: 8192,
    });

    const textBlock = content.find((b) => b.type === "text");
    if (!textBlock?.text) throw new Error("No text response from Claude");

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(textBlock.text));
    } catch {
      throw new Error(`Failed to parse ${mode} JSON: ${textBlock.text.slice(0, 300)}`);
    }

    // Mode-specific validation
    if (mode === "claims") {
      const p = parsed as { video?: unknown; claims?: unknown[] };
      if (!p.video || !Array.isArray(p.claims)) {
        throw new Error(
          `Claims JSON missing video/claims. Keys: ${Object.keys(p).join(", ")}. Raw: ${textBlock.text.slice(0, 200)}`
        );
      }
    } else if (mode === "tldr") {
      const p = parsed as { takeaways?: unknown; one_line?: unknown };
      if (!Array.isArray(p.takeaways) || !p.one_line) {
        throw new Error(
          `TL;DR JSON missing takeaways/one_line. Keys: ${Object.keys(p).join(", ")}. Raw: ${textBlock.text.slice(0, 200)}`
        );
      }
    } else if (mode === "trades") {
      const p = parsed as { trades?: unknown; disclaimer?: unknown; overall_read?: unknown };
      if (!Array.isArray(p.trades) || !p.disclaimer || !p.overall_read) {
        throw new Error(
          `Trades JSON missing trades/disclaimer/overall_read. Keys: ${Object.keys(p).join(", ")}. Raw: ${textBlock.text.slice(0, 200)}`
        );
      }
    }

    return NextResponse.json({ ok: true, mode, data: parsed, usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const lower = message.toLowerCase();
    let status = 500;
    if (lower.includes("api key") || lower.includes("api error 401")) status = 401;
    else if (lower.includes("api error 429")) status = 429;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
