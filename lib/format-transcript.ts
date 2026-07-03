import type { TranscriptSegment } from "./transcript";

function toMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTranscript(transcript: TranscriptSegment[] | string): string {
  if (typeof transcript === "string") return transcript;
  return transcript
    .map((seg) => `[${toMMSS(seg.start)}] ${seg.text}`)
    .join("\n");
}
