import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { VERIFY_PROMPT } from "@/lib/prompts";
import type { Claim, Verification } from "@/lib/schema";

export const runtime = "nodejs";

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

function extractJson(raw: string): string {
  const start = raw.search(/[{[]/);
  if (start === -1) return raw;
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return end > start ? raw.slice(start, end + 1) : raw.slice(start);
}

export async function POST(req: NextRequest) {
  try {
    const { claim } = (await req.json()) as { claim: Claim };

    if (!claim?.id) {
      return NextResponse.json({ ok: false, error: "Missing claim" }, { status: 400 });
    }

    const claimPayload = JSON.stringify(
      {
        title: claim.title,
        explanation: claim.explanation,
        verifiable_assertions: claim.verifiable_assertions,
      },
      null,
      2
    );

    const userMessage =
      claimPayload +
      `\n\nRespond with ONLY this JSON structure, no other text:\n` +
      JSON.stringify(
        {
          assertions: [
            {
              assertion: "the original statement",
              verdict: "Confirmed|Disputed|Mixed|Inconclusive|Outdated",
              evidence: "1-2 sentence summary",
              sources: ["url1"],
            },
          ],
          holds_up: "yes|partially|no|inconclusive",
          one_line: "single direct sentence",
        },
        null,
        2
      );

    const content = await callClaude({
      model: "claude-haiku-4-5-20251001",
      system: VERIFY_PROMPT,
      user: userMessage,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      max_tokens: 4096,
      betas: ["web-search-2025-03-05"],
    });

    const searchCount = content.filter((b) => b.type === "server_tool_use").length;
    console.log(`[verify] claim=${claim.id} title="${claim.title}" web_searches=${searchCount}`);

    // Last text block is the final answer — Claude emits text before/between searches too
    const textBlocks = content.filter((b) => b.type === "text" && b.text);
    if (!textBlocks.length) throw new Error("No text response from Claude");
    const rawText = textBlocks[textBlocks.length - 1].text!;

    let parsed: Omit<Verification, "claim_id" | "verifiedAt">;
    try {
      parsed = JSON.parse(extractJson(stripFences(rawText)));
    } catch {
      throw new Error(`Failed to parse verification JSON: ${rawText.slice(0, 300)}`);
    }

    if (!parsed.assertions || !parsed.holds_up) {
      throw new Error(
        `Verification JSON missing fields. Keys: ${Object.keys(parsed).join(", ")}`
      );
    }

    const verification: Verification = {
      ...parsed,
      claim_id: claim.id,
      verifiedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, data: verification });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const lower = message.toLowerCase();
    const status = lower.includes("api error 429") ? 429 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
