import { Innertube, ClientType } from "youtubei.js";

interface TimedTextEvent {
  tStartMs: number;
  dDurationMs: number;
  segs?: { utf8: string }[];
}

interface TimedTextResponse {
  events?: TimedTextEvent[];
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface VideoMetadata {
  title: string;
  channel: string;
  durationSeconds: number | null;
}

export interface TranscriptResult {
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
}

// Ordered by reliability against anti-bot detection
const FALLBACK_CLIENTS = ["TV_EMBEDDED", "IOS", "WEB_EMBEDDED", "ANDROID"] as const;
type FallbackClient = (typeof FALLBACK_CLIENTS)[number];

async function getInfoChecked(youtube: Innertube, videoId: string, client: FallbackClient) {
  const info = await youtube.getBasicInfo(videoId, { client });
  const ps = info.playability_status;

  if (ps?.status === "ERROR") throw new Error("Video not found");

  if (ps?.status === "LOGIN_REQUIRED") {
    const reason = ps.reason.toLowerCase();
    throw new Error(reason.includes("age") ? "Video is age-restricted" : "Video is private");
  }

  if (ps?.status === "UNPLAYABLE") {
    throw new Error(`Video is unplayable: ${ps.reason}`);
  }

  return info;
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const youtube = await Innertube.create({
    client_type: ClientType.TV_EMBEDDED,
    generate_session_locally: true,
  });

  let lastError: Error = new Error("No transcript available for this video");

  for (const client of FALLBACK_CLIENTS) {
    let info;
    try {
      info = await getInfoChecked(youtube, videoId, client);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // "Video not found" is definitive — no point trying other clients
      if (msg === "Video not found") throw err;
      lastError = err instanceof Error ? err : new Error(msg);
      continue;
    }

    const tracks = info.captions?.caption_tracks ?? [];
    // Prefer manual English, fall back to auto-generated English, then any track
    const track =
      tracks.find((t) => t.language_code === "en" && !t.kind) ??
      tracks.find((t) => t.language_code === "en") ??
      tracks[0];

    if (!track?.base_url) {
      lastError = new Error("No transcript available for this video");
      continue;
    }

    console.log(`[yt-chop] client=${client} succeeded for ${videoId}`);

    let res: Response;
    try {
      res = await fetch(track.base_url + "&fmt=json3");
    } catch (err) {
      throw new Error(`Network error fetching transcript: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) throw new Error(`Failed to fetch transcript data (HTTP ${res.status})`);

    let data: TimedTextResponse;
    try {
      data = await res.json();
    } catch {
      throw new Error("Failed to parse transcript data");
    }

    const transcript: TranscriptSegment[] = (data.events ?? [])
      .filter((ev): ev is TimedTextEvent & { segs: { utf8: string }[] } => !!ev.segs?.length)
      .map((ev) => ({
        start: ev.tStartMs / 1000,
        duration: ev.dDurationMs / 1000,
        text: ev.segs.map((s) => s.utf8).join("").replace(/\n/g, " ").trim(),
      }))
      .filter((seg) => seg.text.length > 0);

    if (transcript.length === 0) {
      lastError = new Error("No transcript available for this video");
      continue;
    }

    const { title, channel, author, duration } = info.basic_info;

    return {
      metadata: {
        title: title ?? "Unknown Title",
        channel: channel?.name ?? author ?? "Unknown Channel",
        durationSeconds: duration ?? null,
      },
      transcript,
    };
  }

  throw lastError;
}
