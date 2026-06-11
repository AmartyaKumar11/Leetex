# LeetEx

AI-powered coding learning OS — Chrome extension. Tracks *how* you solve, not just *what* you solved.

**Phase:** v0.3 — Behavioral Signal Engine

Full product context → [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md)

## Quick Start

```bash
npm install
npm run dev      # load build/chrome-mv3-dev in Chrome
npm run build    # production build → build/chrome-mv3-prod
```

Load unpacked extension from `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (prod).

## What It Does (v0.3)

On `leetcode.com/problems/*`:

- v0.2 observer: signals, attemptHistory, timeline, metrics, snapshots
- **Behavioral Signal Engine** — 17 deterministic signals with confidence + evidence
- **SessionAnalysis** — timeline + metrics + `behavioralSignals[]`
- **`generateBehaviorReport()`** — human-readable behavior summary (no AI)

```typescript
import { behavioralSignalEngine } from "~/services/behavioral-signal-engine"
import { generateBehaviorReport } from "~/utils/behavior-report-generator"

const analysis = behavioralSignalEngine.analyze(session)
const report = generateBehaviorReport(session)
```

## Project Structure

```
src/
├── behavioral/
│   ├── signal-rules.ts      # 17 rule evaluators
│   ├── session-context.ts   # analysis context builder
│   └── confidence.ts        # confidence helpers
├── services/
│   ├── behavioral-signal-engine.ts
│   ├── session-metrics-service.ts
│   └── signal-layer-service.ts
├── utils/
│   ├── behavior-report-generator.ts
│   └── timeline-generator.ts
└── types/                   # behavioral-signal, session-analysis, session, metrics
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
