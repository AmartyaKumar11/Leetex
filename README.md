# LeetEx

AI-powered coding learning OS — Chrome extension. Tracks *how* you solve, not just *what* you solved.

**Phase:** v0.1 — The Observer (session recorder, no AI yet)

Full product context → [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md)

## Quick Start

```bash
npm install
npm run dev      # load build/chrome-mv3-dev in Chrome
npm run build    # production build → build/chrome-mv3-prod
```

Load unpacked extension from `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (prod).

## What It Does (v0.1)

On `leetcode.com/problems/*`:

- Starts session when problem opens
- Captures title + difficulty
- Tracks events: `QUESTION_OPENED`, `RUN_CODE`, `SUBMIT`, `EDITORIAL_OPENED`
- Snapshots editor code at key moments
- Persists to `chrome.storage.local`
- Sidebar shows status + event count
- Export full session JSON

## Project Structure

```
src/
├── background/          # Service worker
├── contents/            # LeetCode CSUI + observer entry
├── components/          # React UI
├── constants/           # Storage keys, match patterns
├── hooks/               # React hooks
├── observers/           # DOM event wiring
├── services/            # SessionManager, StorageService
├── types/               # Session, Event, Snapshot interfaces
└── utils/               # DOM extraction, IDs, export helpers
assets/                  # Extension icon
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev build with HMR |
| `npm run build` | Production build |
| `npm run package` | Zip for store |
| `npm run typecheck` | TypeScript check |
