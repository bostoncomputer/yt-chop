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
  } catch {
    throw new Error("No captions available for this video");
  }

  const tracks = info.captions?.caption_tracks ?? [];
  // Prefer manual English, fall back to auto-generated English, then any track
  const track =
    tracks.find((t) => t.language_code === "en" && !t.kind) ??
    tracks.find((t) => t.language_code === "en") ??
    tracks[0];

  if (!track?.base_url) {
    throw new Error("No captions available for this video");
  }

  const res = await fetch(track.base_url + "&fmt=json3");
  if (!res.ok) throw new Error("No captions available for this video");

  const data: TimedTextResponse = await res.json();

  const transcript: TranscriptSegment[] = (data.events ?? [])
    .filter((ev): ev is TimedTextEvent & { segs: { utf8: string }[] } => !!ev.segs?.length)
    .map((ev) => ({
      start: ev.tStartMs / 1000,
      duration: ev.dDurationMs / 1000,
      text: ev.segs.map((s) => s.utf8).join("").replace(/\n/g, " ").trim(),
    }))
    .filter((seg) => seg.text.length > 0);

  if (transcript.length === 0) {
    throw new Error("No captions available for this video");
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
