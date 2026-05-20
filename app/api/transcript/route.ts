import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript } from "@/lib/transcript";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url ?? "";

    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
    }

    let videoId: string;
    try {
      videoId = extractVideoId(url);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid or unrecognised YouTube URL" },
        { status: 400 }
      );
    }

    const { metadata, transcript } = await fetchTranscript(videoId);

    return NextResponse.json({ ok: true, data: { videoId, metadata, transcript } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const lower = message.toLowerCase();
    let status = 500;
    if (lower.includes("not found") || lower.includes("unavailable")) status = 404;
    else if (lower.includes("private") || lower.includes("age-restricted") || lower.includes("unplayable")) status = 403;
    else if (lower.includes("no transcript") || lower.includes("no captions")) status = 422;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
