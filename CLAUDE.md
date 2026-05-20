# YT Chop — Project Context

YouTube transcript extractor and clip generator. Paste a YouTube URL, fetch the transcript, select segments, and export clips or scripts.

## Build Phases

- **Phase 1 (complete)** — Scaffold + transcript pipeline. Next.js 15, TypeScript, Tailwind. URL parsing, transcript fetch, metadata, raw display. Transcript fetch uses yt-dlp subprocess (NOT youtube-transcript or youtubei.js — both were blocked by YouTube anti-bot). App is local-only; Vercel deployment's transcript route is non-functional. Requires `yt-dlp` installed via `pip install -U yt-dlp` on the host machine.
- Phase 2 — Segment selection UI: click-to-select transcript segments, preview selected text, copy to clipboard.
- Phase 3 — Clip generation: send selected segments to an LLM to rewrite/summarize as a script.
- Phase 4 — Export: download transcript as TXT/SRT, share links.

## Design Tokens

| Token | Value |
|-------|-------|
| Background | `#0d0d0d` |
| Surface | `#171717` |
| Border | `#27272a` (zinc-800) |
| Foreground | `#f0f0f0` |
| Accent | `#f59e0b` (amber-400) |
| Font Display | Bebas Neue (Google Fonts) |
| Font Mono | IBM Plex Mono (Google Fonts) |

## File Structure

```
yt-chop/
├── app/
│   ├── api/
│   │   └── transcript/
│   │       └── route.ts       # POST /api/transcript — accepts { url }
│   ├── globals.css            # Design tokens + base styles
│   ├── layout.tsx             # Root layout with fonts
│   └── page.tsx               # Single-page client component
├── components/
│   └── UrlInput.tsx           # URL input + fetch form
├── lib/
│   ├── youtube.ts             # extractVideoId(url) — URL parser
│   └── transcript.ts         # fetchTranscript(videoId) — transcript + metadata
├── CLAUDE.md                  # This file
└── YTChop_BuildSpec_v1_0.docx # Original build specification
```

## Key Decisions

- **Local-only app** — transcript route runs `yt-dlp` as a subprocess. `yt-dlp` must be installed on the host machine: `pip install yt-dlp`. The Vercel/edge deployment path is intentionally unsupported; `runtime = "nodejs"` is required in the route.
- **yt-dlp transcript fetch** — two subprocess calls per request: (1) `yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format json3` writes a caption file to `os.tmpdir()`; (2) `yt-dlp --skip-download -j` dumps JSON for title/channel/duration. Uses `execFile` (not `exec`) to avoid shell metacharacter issues with the `%(id)s` output template on Windows.
- **Caption format: json3** — yt-dlp auto-sub VTT has rolling-window cues (each cue accumulates words from prior cue), producing duplicates. `json3` gives clean non-overlapping `{tStartMs, dDurationMs, segs}` events matching the pre-yt-dlp shape; file extension is `.en.json3`.
- **Output template** — uses `ytchop-%(id)s` (no `%(ext)s`) so the caption file is predictably `ytchop-{videoId}.en.json3` in the temp dir. File is deleted after parsing.
- Videos with no English auto-sub track produce no caption file; `lib/transcript.ts` detects the missing file and throws `"No captions available for this video"` → HTTP 422.
- yt-dlp may warn about missing JS runtime (Deno/Node.js for PO token); install `deno` or pass `--js-runtimes nodejs` to suppress. The extractor works without it but some throttled videos may hit 429.
- Tailwind v4 — uses `@import "tailwindcss"` and `@theme inline {}` blocks, not a separate `tailwind.config.js`.

## Dev

```bash
npm run dev      # http://localhost:3000
npx tsc --noEmit # type check
```
