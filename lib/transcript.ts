import { Innertube } from "youtubei.js";

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

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const youtube = await Innertube.create({ generate_session_locally: true });

  let info;
  try {
    info = await youtube.getInfo(videoId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes("private")) throw new Error("Video is private");
    if (lower.includes("age")) throw new Error("Video is age-restricted");
    if (lower.includes("not found") || lower.includes("unavailable") || lower.includes("404")) {
      throw new Error("Video not found");
    }
    throw new Error(`Failed to load video: ${msg}`);
  }

  // Inspect playability status for private / restricted / deleted videos
  const ps = info.playability_status as { status?: string; reason?: string } | undefined;
  if (ps?.status === "LOGIN_REQUIRED") {
    const reason = (ps.reason ?? "").toLowerCase();
    if (reason.includes("age")) throw new Error("Video is age-restricted");
    throw new Error("Video is private");
  }
  if (ps?.status === "ERROR") throw new Error("Video not found");
  if (ps?.status === "UNPLAYABLE") {
    throw new Error(`Video is unplayable: ${ps.reason ?? "unknown reason"}`);
  }

  if (info.basic_info.is_private) throw new Error("Video is private");

  const tracks = info.captions?.caption_tracks ?? [];
  // Prefer manual English, fall back to auto-generated English, then any track
  const track =
    tracks.find((t) => t.language_code === "en" && !t.kind) ??
    tracks.find((t) => t.language_code === "en") ??
    tracks[0];

  if (!track?.base_url) {
    throw new Error("No transcript available for this video");
  }

  let res: Response;
  try {
    res = await fetch(track.base_url + "&fmt=json3");
  } catch (err) {
    throw new Error(`Network error fetching transcript: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch transcript data (HTTP ${res.status})`);
  }

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
    throw new Error("No transcript available for this video");
  }

  const { title, channel, duration } = info.basic_info;

  return {
    metadata: {
      title: title ?? "Unknown Title",
      channel: channel?.name ?? "Unknown Channel",
      durationSeconds: duration ?? null,
    },
    transcript,
  };
}
