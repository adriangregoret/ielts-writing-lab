# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An IELTS General Training **Writing** trainer, deployed on Vercel as a **static site + one serverless function** (Vercel "Other" preset — no build step, no framework). There are only two real source files: `index.html` (the entire frontend) and `api/evaluate.js` (the AI backend).

## Commands

- **Deploy:** push to the connected GitHub repo, or `vercel --prod`. There is no build/lint/test step.
- **Local dev:** `vercel dev` (serves `index.html` and runs `api/evaluate.js` locally; requires the env vars below). Opening `index.html` directly works for everything **except** the 🤖 AI button, which needs the serverless function.
- **Syntax-check the frontend JS** (it lives inside `<script>` in `index.html`): extract the script block and run `node --check` on it — the whole app is one vanilla-JS IIFE, so a syntax slip breaks the entire page silently.

## Required environment variables (set in Vercel → Settings → Environment Variables)

- `ANTHROPIC_API_KEY` — server-side only; read by the Anthropic SDK in `api/evaluate.js`. Never goes in the browser or in committed files.
- `APP_PASSWORD` — gates the AI endpoint. The browser sends it as the `x-app-password` header; the function 401s on mismatch. If unset, the endpoint is open to anyone with the URL.

## Architecture

**`index.html` — the whole frontend in one file.** A single IIFE holds all state and views; there is no framework. Key structure to know before editing:

- **State + persistence:** one `state` object (XP, streak, `games`, `written`, `checks`, `log`, `aiPassword`, `theme`) persisted to `localStorage` under `ielts_writing_lab_v1`. `save()` after every mutation. Changing the shape means updating `defaultState` and the `load()` merge.
- **Routing:** hash-free SPA. `views[...]` functions render into `#main`; `go(view)` swaps them. Nav is driven by the `NAV` array + sidebar buttons + mobile tabs — add a route in all three plus a `views.<name>`.
- **Two evaluation paths, deliberately separate:**
  1. **Offline heuristic checker** — `analyzeWriting()` / `estimateBand()` / `criteriaFeedback()` run fully client-side (regex + structure heuristics), auto-run on a debounce and on blur, and feed the live checklist + the offline report. No network.
  2. **Online AI checker** — `aiEvaluate()` POSTs to `/api/evaluate` and renders the response via `renderAIReport()`. This is the only network call in the app.
- **Both paths write to the same log** (`saveToLog` / `saveAIResultToLog`) with an identical `{cat, text}` tip shape, so the "Mistakes & Tips" view aggregates offline and AI findings together. Keep that shape stable when adding either source.
- **Content banks** (`task1`, `task2`, the game `*Bank` arrays) are plain data at the top of the IIFE — add prompts/questions there, not in view code. Quiz options are shuffled per-render in `quizView`, so correct-answer index in the bank is authoring-only.

**`api/evaluate.js` — the AI backend.** A Vercel Node serverless function (ESM). It validates `APP_PASSWORD`, builds an examiner prompt (IELTS Advantage / Chris Pell persona — see `[[ielts-correction-style]]` conventions), and calls **`claude-sonnet-5`** with `output_config.format` bound to a strict JSON schema (`bands` / `mistakes` / `band8_rewrite` / `practice`). The frontend depends on that exact JSON shape — changing the schema means changing `renderAIReport()` and `saveAIResultToLog()` too. `thinking` is disabled for latency/cost; `vercel.json` sets `maxDuration: 60`.

## Notes

- The **offline** dashboard is also published as a standalone Claude Artifact from `../ielts-writing-dashboard.html` (same UI, no backend, "copy prompt for Claude" instead of the live AI call). This repo is the online superset — keep the shared UI/logic in sync when it matters.
- Model swap: change `claude-sonnet-5` in `api/evaluate.js` (`claude-opus-4-8` for max quality ~3× cost; `claude-haiku-4-5` for cheapest). ~1–2¢ per correction on Sonnet 5.
