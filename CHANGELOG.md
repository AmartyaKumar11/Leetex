# Changelog

All notable changes to LeetEx are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

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
