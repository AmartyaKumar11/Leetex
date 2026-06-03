# LeetEx

AI-powered coding learning OS — Chrome extension. Tracks *how* you solve, not just *what* you solved.

**Phase:** v0.2.1 — Observer Stabilization

Full product context → [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md)

## Quick Start

```bash
npm install
npm run dev      # load build/chrome-mv3-dev in Chrome
npm run build    # production build → build/chrome-mv3-prod
```

Load unpacked extension from `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (prod).

## What It Does (v0.2.1)

On `leetcode.com/problems/*`:

- v0.2 signals + attemptHistory + timeline
- **Periodic snapshots** every 30s (if code changed)
- **Snapshot hashing** (SHA-256) + `similarityToPrevious`
- **Result hardening:** `sourcePanel`, `confidence`, panel validation
- **Session metrics:** `timeToFirstEdit`, `totalRuns`, `sessionDuration`, etc.

## Project Structure

```
src/
├── services/
│   ├── snapshot-scheduler-service.ts
│   ├── snapshot-hash-service.ts
│   ├── session-metrics-service.ts
│   ├── result-extraction-service.ts
│   └── signal-layer-service.ts
├── utils/
│   ├── leetcode-result-extractor.ts
│   ├── calculate-similarity.ts
│   └── timeline-generator.ts
└── types/               # session, snapshot, metrics, results
```

## Debug modes

```javascript
localStorage.setItem("LEETEX_DEBUG_OBSERVER", "true")   // full pipeline
localStorage.setItem("LEETEX_DEBUG_RESULTS", "true")    // result extraction
localStorage.setItem("LEETEX_DEBUG_FIRST_EDIT", "true")   // first-edit checks
```

## Scripts
|---------|-------------|
| `npm run dev` | Dev build with HMR |
| `npm run build` | Production build |
| `npm run package` | Zip for store |
| `npm run typecheck` | TypeScript check |
