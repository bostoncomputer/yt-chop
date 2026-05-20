import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript } from "@/lib/transcript";

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
    const isNoCaptions = message.includes("No captions");
    return NextResponse.json(
      { ok: false, error: message },
      { status: isNoCaptions ? 422 : 500 }
    );
  }
}
