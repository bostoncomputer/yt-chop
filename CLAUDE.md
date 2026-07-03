# YT Chop — Project Context

YouTube transcript extractor and clip generator. Paste a YouTube URL, fetch the transcript, select segments, and export clips or scripts.

## Build Phases

- **Phase 1 (complete)** — Scaffold + transcript pipeline. Next.js 15, TypeScript, Tailwind. URL parsing, transcript fetch, metadata, raw display. Transcript fetch uses yt-dlp subprocess (NOT youtube-transcript or youtubei.js — both were blocked by YouTube anti-bot). App is local-only; Vercel deployment's transcript route is non-functional. Requires `yt-dlp` installed via `pip install -U yt-dlp` on the host machine.
- **Phase 2 (complete)** — Audit pipeline. `lib/schema.ts` (Audit/Claim/Verification types), `lib/prompts.ts` (AUDIT_PROMPT + VERIFY_PROMPT verbatim from spec), `lib/anthropic.ts` (raw fetch wrapper), `POST /api/audit` (edge runtime). Page auto-fires audit after transcript; renders raw JSON. Tested against 3 videos (TED talks spanning high/mixed credibility and low/high padding).
- **Phase 3 (complete)** — Card UI: VerdictCard, ClaimCard, BadgeStack, YouTubeEmbed. Replaced raw JSON pre with proper card layout. Single openClaimId state for mutual-exclusive inline embeds.
- **Phase 4 (complete)** — Per-claim verification. POST /api/verify (nodejs runtime, claude-sonnet-5 + web_search_20250305). VerifyButton, VerifyResult components. Verifications lifted into separate useState in page.tsx; re-check link replaces button after first verify. JSON schema template appended to user message (same pattern as audit route) to fix Sonnet's key naming. lib/anthropic.ts updated: ContentBlock.type widened to string, betas[] param added.
- Phase 5 — Export + localStorage history.

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
│   │   ├── transcript/
│   │   │   └── route.ts       # POST /api/transcript — node runtime, yt-dlp subprocess
│   │   └── audit/
│   │       └── route.ts       # POST /api/audit — edge runtime, Claude Haiku 4.5
│   ├── globals.css            # Design tokens + base styles
│   ├── layout.tsx             # Root layout with fonts
│   └── page.tsx               # Single-page client component
├── components/
│   └── UrlInput.tsx           # URL input + fetch form
├── lib/
│   ├── youtube.ts             # extractVideoId(url) — URL parser
│   ├── transcript.ts         # fetchTranscript(videoId) — yt-dlp subprocess, json3 captions
│   ├── schema.ts             # Audit, Claim, Verification types
│   ├── prompts.ts            # AUDIT_PROMPT, VERIFY_PROMPT (verbatim from spec)
│   └── anthropic.ts          # callClaude({ model, system, user, tools?, max_tokens })
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
- **Audit route** — edge runtime; model `claude-haiku-4-5-20251001`; formats transcript as `[MM:SS] text` lines. Haiku does not reliably follow a schema described only in prose, so a JSON skeleton is appended to the *user* message (not the system prompt, which is spec-locked). Response extraction uses `extractJson` (find first `{`/last `}`) instead of a fence-stripping regex — Claude 4.5 Haiku intermittently prepends whitespace before the opening fence, defeating `^`-anchored regex.
- **`lib/prompts.ts`** — AUDIT_PROMPT and VERIFY_PROMPT are verbatim from spec Section 5. Do not paraphrase or shorten; they are the product.
- Tailwind v4 — uses `@import "tailwindcss"` and `@theme inline {}` blocks, not a separate `tailwind.config.js`.

## Dev

```bash
npm run dev      # http://localhost:3000
npx tsc --noEmit # type check
```

## v1.1 — Genre-aware audits (post-MVP)

After Phase 5 ships, add genre routing:
1. New /api/classify endpoint (Haiku, ~$0.0005/call)
2. Genre-specific AUDIT_PROMPT_* constants in /lib/prompts.ts
3. UI badge with override dropdown before audit fires
4. Initial genres: General (current), Finance/Stock guru

Finance prompt additions:
- New claim type: Prediction (target + timeframe)
- New flags: Position_Undisclosed, Chart_Dependent, Post_Hoc_Win_Claim
- New verdict field: predictions[] array


## v1.1 — Extraction modes (current phase)

Design: YTChop_BuildSpec_v1_1.docx (full phase prompts there).

**Scope (this build):** claims + tldr + trades only. Dropped: clean_transcript,
action_checklist, predictions, PDF.

**Model strings (authoritative — override older spec):**
- Extraction modes: claude-haiku-4-5
- Verify: claude-sonnet-5 (stays Sonnet; string bumped from 4-6, not switched to Haiku)
- Obsolete, never reintroduce: claude-sonnet-4-5*, claude-sonnet-4-6

**Architecture:** single audit → MODES registry (/lib/modes.ts, single source of truth).
Dispatch: POST /api/extract { mode, metadata, transcript, sourceType } → { ok, mode,
data, usage }. Claims stays top-level (video/claims/verifications); new modes →
audit.outputs[mode]. Additive, no migration.

**Input:** YouTube | Paste Text tab. Paste → sourceType 'text', metadata channel/duration
null, skip /api/transcript. Timestamps/embed inert on text.

**Cost counter:** /lib/pricing.ts + costFromUsage(usage). Blended session total, ≈
prefix, session-only (resets on reload/?v=). Verify cost folds into same total. Rates:
in $1 / out $5 / cacheW $1.25 / cacheR $0.10 per MTok, web search $0.01/call.

**Build order:** A (registry+paste+cost) → C (trades) → D-trimmed (txt export only).
Sequential build-then-test.

**Open decision:** verify Sonnet-vs-Haiku (~3× cost) — deferred until counter shows data.