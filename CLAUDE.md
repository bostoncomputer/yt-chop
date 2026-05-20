# YT Chop — Project Context

YouTube transcript extractor and clip generator. Paste a YouTube URL, fetch the transcript, select segments, and export clips or scripts.

## Build Phases

- **Phase 1 (current)** — Scaffold + transcript pipeline. Next.js 15, TypeScript, Tailwind. URL parsing, transcript fetch, metadata, raw display.
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

- `youtubei.js` — used for all YouTube data. `Innertube.create({ generate_session_locally: true })` creates a session without an extra network round-trip. `getInfo(videoId)` returns player + next responses in one call; `basic_info` contains title, channel, and duration.
- Transcript is fetched via the timedtext API (`info.captions.caption_tracks[n].base_url + "&fmt=json3"`), not the InnerTube continuation endpoint (which returns 400 server-side). Events return `{ tStartMs, dDurationMs, segs: [{utf8}] }` in milliseconds; `lib/transcript.ts` converts to seconds on the way out.
- Track selection: manual English → auto-generated English → first available track. No oEmbed call needed — metadata comes from `basic_info`.
- Videos with no caption tracks throw `"No captions available for this video"` which the route converts to HTTP 422.
- Tailwind v4 — uses `@import "tailwindcss"` and `@theme inline {}` blocks, not a separate `tailwind.config.js`.

## Dev

```bash
npm run dev      # http://localhost:3000
npx tsc --noEmit # type check
```
