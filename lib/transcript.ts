import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

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

interface OEmbedResponse {
  title: string;
  author_name: string;
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const [rawTranscript, oembed] = await Promise.all([
    YoutubeTranscript.fetchTranscript(videoId).catch((err: unknown) => {
      if (
        err instanceof YoutubeTranscriptDisabledError ||
        err instanceof YoutubeTranscriptNotAvailableError ||
        err instanceof YoutubeTranscriptVideoUnavailableError
      ) {
        throw new Error("No captions available for this video");
      }
      throw err;
    }),
    fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    ).then(async (res) => {
      if (!res.ok) throw new Error("Could not fetch video metadata");
      return res.json() as Promise<OEmbedResponse>;
    }),
  ]);

  // offset and duration are in milliseconds
  const transcript: TranscriptSegment[] = rawTranscript.map((seg) => ({
    start: seg.offset / 1000,
    duration: seg.duration / 1000,
    text: seg.text,
  }));

  const lastSeg = transcript[transcript.length - 1];
  const durationSeconds =
    lastSeg ? Math.ceil(lastSeg.start + lastSeg.duration) : null;

  return {
    metadata: {
      title: oembed.title,
      channel: oembed.author_name,
      durationSeconds,
    },
    transcript,
  };
}
