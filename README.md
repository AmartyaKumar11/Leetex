# LeetEx

AI-powered coding learning OS — Chrome extension. Tracks *how* you solve, not just *what* you solved.

**Phase:** v0.2 — Signal Layer (behavioral signals, no AI yet)

Full product context → [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md)

## Quick Start

```bash
npm install
npm run dev      # load build/chrome-mv3-dev in Chrome
npm run build    # production build → build/chrome-mv3-prod
```

Load unpacked extension from `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (prod).

## What It Does (v0.2)

On `leetcode.com/problems/*`:

- v0.1: sessions, snapshots, export, sidebar
- **Signals:** `FIRST_EDIT`, `FIRST_RUN`, `FIRST_SUBMIT`, `IDLE_*`, `LANGUAGE_CHANGED`, `MAJOR_REWRITE`, `RUN_RESULT`, `SUBMISSION_RESULT`
- **attemptHistory** auto-filled from run/submit results
- **Timeline:** `generateTimeline(session)` in `src/utils/timeline-generator.ts`

## Project Structure

```
src/
├── background/
├── contents/
├── components/
├── constants/           # signals.ts (idle threshold, rewrite %, poll intervals)
├── hooks/
├── observers/           # LeetCodeSessionObserver
├── services/
│   ├── session-manager.ts
│   ├── storage-service.ts
│   ├── signal-layer-service.ts      # orchestrates v0.2 signals
│   ├── idle-detection-service.ts
│   ├── rewrite-detection-service.ts
│   └── result-extraction-service.ts
├── types/               # session, events, attempt, results, timeline
└── utils/
    ├── timeline-generator.ts
    ├── code-similarity.ts
    └── leetcode-results.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev build with HMR |
| `npm run build` | Production build |
| `npm run package` | Zip for store |
| `npm run typecheck` | TypeScript check |
