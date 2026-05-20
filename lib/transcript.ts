import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

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

interface Json3Seg {
  utf8: string;
}

interface Json3Event {
  tStartMs: number;
  dDurationMs: number;
  segs?: Json3Seg[];
}

interface Json3File {
  events?: Json3Event[];
}

function isNotInstalled(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("not recognized") || msg.includes("command not found");
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const tmp = tmpdir();
  // No %(ext)s in template — subtitle file is predictably ytchop-{id}.en.json3
  const outputTemplate = join(tmp, "ytchop-%(id)s");
  const captionPath = join(tmp, `ytchop-${videoId}.en.json3`);

  // Step 1: Fetch auto-generated English captions as JSON3
  try {
    await execFileAsync("yt-dlp", [
      "--write-auto-sub",
      "--sub-lang", "en",
      "--skip-download",
      "--sub-format", "json3",
      "--output", outputTemplate,
      videoUrl,
    ]);
  } catch (err) {
    if (isNotInstalled(err)) throw new Error("yt-dlp is not installed — run: pip install yt-dlp");
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const detail = stderr || (err instanceof Error ? err.message : String(err));
    const lower = detail.toLowerCase();
    if (lower.includes("video unavailable") || lower.includes("this video is not available")) {
      throw new Error("Video not found or unavailable");
    }
    throw new Error(`yt-dlp caption fetch failed: ${detail.trim()}`);
  }

  // Step 2: Read caption file — if missing, no captions track exists
  let captionContent: string;
  try {
    captionContent = await readFile(captionPath, "utf-8");
  } catch {
    throw new Error("No captions available for this video");
  } finally {
    unlink(captionPath).catch(() => {});
  }

  // Step 3: Fetch metadata
  let metadata: VideoMetadata;
  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      ["--skip-download", "-j", videoUrl],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    const info = JSON.parse(stdout.trim());
    metadata = {
      title: info.title ?? "Unknown Title",
      channel: info.uploader ?? info.channel ?? "Unknown Channel",
      durationSeconds: typeof info.duration === "number" ? info.duration : null,
    };
  } catch (err) {
    if (isNotInstalled(err)) throw new Error("yt-dlp is not installed — run: pip install yt-dlp");
    throw new Error(`Failed to fetch metadata: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 4: Parse JSON3 caption format
  let data: Json3File;
  try {
    data = JSON.parse(captionContent);
  } catch {
    throw new Error("Failed to parse caption data");
  }

  const transcript: TranscriptSegment[] = (data.events ?? [])
    .filter((ev): ev is Json3Event & { segs: Json3Seg[] } => !!ev.segs?.length)
    .map((ev) => ({
      start: ev.tStartMs / 1000,
      duration: ev.dDurationMs / 1000,
      text: ev.segs.map((s) => s.utf8).join("").replace(/\n/g, " ").trim(),
    }))
    .filter((seg) => seg.text.length > 0);

  if (transcript.length === 0) throw new Error("No captions available for this video");

  return { metadata, transcript };
}
