# Changelog

All notable changes to LeetEx are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [0.3.2-alpha] — 2026-06-01

### Added — Learning Source Tracking

- **Events:** `EDITORIAL_OPENED/CLOSED`, `SOLUTION_OPENED/CLOSED`, `DISCUSSION_OPENED/CLOSED`
- **Session field:** `learningSources` with `visits` + `timeMs` per source
- **Session field:** `learningSourceVisits` — one record per open→close cycle (`openedAt`, `closedAt`, `durationMs`)
- **Detection:** URL paths (`/editorial`, `/solution`, `/discuss`) + tab labels + `aria-selected`
- **Rules:** open/close on tab transitions; session-end auto-close with `durationMs`
- **Docs:** `docs/learning-source-dom.md`, `docs/learning-source-testing.md`

---

## [0.3.1-alpha] — 2026-06-01

### Added — Reliability & Result Extraction

- **`errorText`** on attempt history for compile/runtime errors
- Semantic label-based extraction (Input, Output, Expected, Runtime, Memory)
- Failed testcase section detection via case row markers
- Extraction waits until status-specific fields are complete
- Improved confidence scoring (10 fields weighted)
- Duplicate capture prevention (1.5s window)
- Debug logs: `[LeetEx Result Extractor]` field-level output
- Retries increased to 30 / 12s timeout

### Fixed — Wrong Answer Extraction (phase closed)

- **Input parameter cards** — use `.font-menlo.mx-3.whitespace-pre-wrap` (not `.relative` used by Output/Expected)
- **`failedInput` reconstruction** — `nums=[3,2,4]\ntarget=6` label/value pairs verified
- **`passed`/`total`** — marked optional in diagnostics; LeetCode UI shows Case ✓/✗ only, not explicit counts
- **`isExtractionComplete`** — Wrong Answer no longer requires passed/total
- Investigation debug logs removed; `LEETEX_DEBUG_RESULTS` gated logging retained

### Pending before extraction freeze

- Accepted `runtime` + `memory` verification on live LeetCode panels

---

## [0.3.1.1-alpha] — 2026-06-01

### Fixed — Result Extraction Hardening

- **`errorCategory`** — SyntaxError, TypeError, CompileError, etc.
- **Panel root discovery** — climbs DOM to full result subtree (fixes wrong-subtree extraction)
- **Status anchor discovery** — finds panels by visible "Runtime Error", "Accepted", etc.
- **Multiline error blocks** — SyntaxError + caret + Line N (Solution.py)
- **No early finish** — waits until `isExtractionComplete` or timeout (removed max-retry shortcut)
- **Accepted runtime/memory** — label chips + standalone `2 ms` / `43.8 MB` values
- Debug: `Error Block Found`, `Extraction Complete`

---

## [0.3.0-alpha] — 2026-06-01

### Added — Alpha Distribution Infrastructure

- **UserIdentityService** — UUID v4 per installation, persisted in `chrome.storage.local`
- **VersionService** — exposes `0.3.0-alpha` on all exports
- **Export format v2** — `{ metadata, session }` with userId, version, exportedAt, browser, platform
- **Export validation** — blocks export if userId, version, or session missing
- **Consent modal** — first-launch transparency flow with persistent acceptance
- **About LeetEx** — User ID, version, extension status, copy User ID button
- **Documentation** — README, INSTALLATION, PRIVACY, CHANGELOG

---

## [0.3.1] — 2026-06-01

### Changed — Premium UI

- Floating collapsible sidebar with Framer Motion
- Amber Minimal shadcn theme, Poppins typography
- Learning Insights (user-facing behavioral signals)
- Full-height dark sidebar layout

---

## [0.3.0] — 2026-06-01

### Added — Behavioral Signal Engine

- `BehavioralSignalEngine` with 17 deterministic signal rules
- Confidence scores and evidence arrays per signal
- `SessionAnalysis` model (timeline + metrics + behavioralSignals)
- `generateBehaviorReport()` utility

---

## [0.2.1] — 2026-06-03

### Added — Observer Stabilization

- Periodic snapshots every 30s (code-changed only)
- Snapshot SHA-256 hashing + `similarityToPrevious`
- Session metrics (`timeToFirstEdit`, `totalRuns`, etc.)
- Result hardening: `sourcePanel`, `confidence` scoring
- Debug modes: `LEETEX_DEBUG_OBSERVER`, `LEETEX_DEBUG_RESULTS`

---

## [0.2.0] — 2026-06-01

### Added — Signal Layer

- Behavioral events: `FIRST_EDIT`, `FIRST_RUN`, `FIRST_SUBMIT`, idle, language change
- `MAJOR_REWRITE` detection (bigram similarity)
- `RUN_RESULT` / `SUBMISSION_RESULT` DOM extraction
- `attemptHistory` on session model
- `generateTimeline()` utility

---

## [0.1.0] — 2026-05-31

### Added — The Observer

- Plasmo Chrome extension on `leetcode.com/problems/*`
- Session lifecycle (auto start/end on navigation)
- Event collection: question opened, run, submit, editorial
- Monaco code snapshots on triggers
- Local storage + JSON export
- Sidebar UI

---

[0.3.0-alpha]: https://github.com/your-org/leetex/compare/v0.3.0...v0.3.0-alpha
