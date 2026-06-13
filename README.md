# LeetEx

LeetEx is a Chrome extension that observes *how* you solve coding problems — not just whether you got the answer right.

It runs quietly on LeetCode, records your problem-solving journey, and exports structured session data you control. The long-term vision is a personalized coding mentor; today, LeetEx is in **Alpha** and focused on collecting high-quality behavioral data.

**Current version:** `0.3.0-alpha`

---

## What is LeetEx?

Most platforms track outcomes: questions solved, acceptance rate, streaks.

LeetEx tracks **process**:

- When you read vs. when you start coding
- How you iterate, debug, and recover from errors
- Whether you pivot approaches or depend on hints
- A full timeline of your solving session

LeetEx does **not** solve problems for you. It observes, analyzes locally, and lets you export sessions when *you* choose.

---

## Core Features (Alpha)

| Feature | Description |
|---------|-------------|
| **Session Observer** | Auto-starts on LeetCode problem pages |
| **Event Capture** | Edits, runs, submits, rewrites, idle periods |
| **Code Snapshots** | Periodic + trigger-based code captures |
| **Learning Insights** | Deterministic behavioral signals (no AI) |
| **Session Timeline** | Chronological view of your session |
| **Manual Export** | Download JSON with metadata for analysis |
| **User Identity** | Stable UUID per installation for tracing exports |

---

## Installation

See **[INSTALLATION.md](./INSTALLATION.md)** for step-by-step setup.

Quick start:

```bash
git clone https://github.com/your-org/leetex.git
cd leetex
npm install
npm run build
```

Load `build/chrome-mv3-prod` as an unpacked extension in Chrome.

---

## Exporting Sessions

1. Open a LeetCode problem and solve (or partially solve) it.
2. Click the **LX** pill on the left to open LeetEx.
3. Click **Export Session** at the bottom.

Exported JSON format:

```json
{
  "metadata": {
    "userId": "c1fd34ea-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "leetexVersion": "0.3.0-alpha",
    "exportedAt": "2026-06-01T12:00:00.000Z",
    "browser": "Chrome",
    "platform": "leetcode"
  },
  "session": { ... }
}
```

The `userId` lets alpha testers trace sessions back to a specific installation. Share exports only with people you trust.

---

## Privacy

LeetEx does **not** upload data automatically. Read **[PRIVACY.md](./PRIVACY.md)** for full details.

---

## Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| v0.1 | ✅ | Session observer, events, snapshots |
| v0.2 | ✅ | Signal layer, attempt history, timeline |
| v0.2.1 | ✅ | Metrics, hashing, result hardening |
| v0.3 | ✅ | Behavioral signal engine |
| **Alpha** | 🔄 | Distribution, identity, documentation |
| v0.4+ | Planned | Skill graph, AI diagnosis (future) |

---

## Alpha Disclaimer

LeetEx Alpha is for **5–20 trusted developer friends** helping validate session data collection.

- Expect bugs and UI changes
- Exports may evolve between versions
- No cloud sync, accounts, or automatic uploads
- Feedback on export quality and observer accuracy is valuable

---

## Development

```bash
npm run dev        # dev build → build/chrome-mv3-dev
npm run build      # production build
npm run typecheck  # TypeScript check
npm run package    # zip for distribution
```

Project context: [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md)  
Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

---

## License

Alpha software — use at your own discretion. License TBD before public release.
