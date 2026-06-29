# LeetEx - Master Context

> **Last updated:** 2026-06-01  
> **Current phase:** v0.6 — Problem Metadata Layer  
> **Status:** In progress — topic tags via LeetCode GraphQL + problems/sessions upsert

---

## Project Overview

LeetEx is an AI-powered coding learning operating system delivered through a Chrome Extension.

The goal is **not** to help users solve coding problems.

The goal is to understand how users solve coding problems, diagnose underlying skill gaps, and prescribe personalized learning paths.

LeetEx focuses on the **learning process** rather than the final answer.

---

## Core Mission

Most coding platforms track:

- Questions solved
- Acceptance rate
- Streaks
- Difficulty

LeetEx tracks:

- Problem-solving behavior
- Learning patterns
- Skill progression
- Recurring weaknesses

The system should answer:

1. What happened during the solving session?
2. Why did it happen?
3. What skill is weak?
4. What improved?
5. What should the user solve next?

---

## Product Vision

LeetEx acts as a personalized coding mentor.

Instead of recommending random problems or generic sheets, it continuously builds a cognitive profile of the user and recommends targeted practice.

The user should never need to ask:

- What am I weak at?
- Why did I fail?
- What should I solve next?
- Can you make me a roadmap?

LeetEx should already know.

---

## MVP Scope

**Platform Support:**

- LeetCode only

**Future:**

- GeeksForGeeks
- Codeforces
- Coding Ninjas
- AtCoder

---

## User Journey

```
User opens a LeetCode problem
        ↓
LeetEx starts recording the session
        ↓
User solves the problem
        ↓
LeetEx reconstructs the solving journey
        ↓
LeetEx generates a diagnosis
        ↓
LeetEx updates the user's skill graph
        ↓
LeetEx recommends the next problem
```

---

## Core Outputs

Every session should eventually generate:

### What Happened

Timeline reconstruction.

Example:

- Started with brute force
- Explored nested loops
- Switched to HashMap
- Accepted solution

### Diagnosis

Supported diagnosis categories:

- Pattern Recognition
- Algorithm Selection
- Complexity Analysis
- State Design
- Edge Case Reasoning
- Knowledge Gap
- Optimization Recognition

### Skill Update

Example:

```
HashMap Recognition: 61 → 67
```

### Prescription

Example:

```
Recommended Next Question: Contains Duplicate
Reason: Strengthens HashMap pattern recognition.
```

---

## Skill Graph Philosophy

LeetEx tracks **skills**, not topics.

**Bad:**

```
Graphs = 70%
```

**Good:**

```
Graphs
  ├── BFS Recognition
  ├── DFS Recognition
  ├── Visited State Design
  ├── Topological Sort
  └── Union Find Recognition

DP
  ├── State Definition
  ├── Transition Design
  ├── Memoization
  └── Tabulation

Arrays
  ├── HashMap Recognition
  ├── Sliding Window Recognition
  └── Prefix Sum Recognition
```

---

## Recommendation Philosophy

Recommendations must **never** be random.

Recommendations are generated from:

```
Weakest Skill + Current User Level + Learning Progression
```

Every recommendation must include a reason.

---

## Architecture Philosophy

The system is divided into:

1. **Observation Layer** — session tracking, event collection
2. **Analysis Layer** — journey reconstruction, diagnosis
3. **Skill Layer** — skill graph, progression tracking
4. **Recommendation Layer** — targeted problem prescription
5. **Presentation Layer** — UI, extension popup, dashboards

The intelligence lives in the Analysis, Skill, and Recommendation layers.

UI is only a presentation mechanism.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Extension | Plasmo, React, TypeScript |
| Backend (Future) | FastAPI, PostgreSQL |
| AI | Gemini |
| Hosting | Railway, Vercel |
| Authentication | GitHub OAuth |

---

## Important Rule

**Do not implement advanced AI features before the session tracking foundation is complete.**

The entire product depends on collecting high-quality behavioral data first.

---

## Current Development Phase

| Field | Value |
|-------|-------|
| Version | v0.3.1-alpha |
| Codename | Reliability & Result Extraction |
| Goal | Complete run/submit debugging context in attemptHistory |

**In scope (v0.3.1):**

- `errorText` for compile/runtime errors
- Failed testcase: input, actual/expected output
- Semantic DOM extraction (label anchors, not class names)
- Extraction completeness gate + improved confidence
- `[LeetEx Result Extractor]` debug logging

**In scope (Alpha):**

- `UserIdentityService` — UUID v4 per installation
- `VersionService` — version on all exports
- Export format `{ metadata, session }` with validation
- First-launch consent modal
- About LeetEx (User ID, version, copy)
- README, INSTALLATION, PRIVACY, CHANGELOG

**In scope (v0.3):**

- `BehavioralSignalEngine` — 17 deterministic signal rules across 7 categories
- Confidence scoring + evidence arrays per signal
- `SessionAnalysis` (timeline + metrics + behavioralSignals)
- `generateBehaviorReport()` — human-readable deterministic summary
- `sessionManager.analyzeSession()` API

**In scope (v0.2.1):**

- Periodic snapshots (30s, code-changed only)
- Snapshot SHA-256 hashing + similarityToPrevious
- Result sourcePanel + confidence scoring
- Session metrics (timeToFirstEdit, totalRuns, etc.)
- LEETEX_DEBUG_OBSERVER tooling
- Timeline includes PERIODIC_SNAPSHOT + key signals

**In scope (v0.2):**

- FIRST_EDIT, FIRST_RUN, FIRST_SUBMIT (once per session)
- IDLE_STARTED / IDLE_ENDED (120s threshold, multiple periods)
- LANGUAGE_CHANGED
- MAJOR_REWRITE (bigram similarity &lt; 40%)
- RUN_RESULT / SUBMISSION_RESULT (DOM extraction)
- attemptHistory on session
- generateTimeline() utility

**Still out of scope:**

- AI / Gemini
- Backend / Database
- Skill graph
- Recommendations

v0.1 foundation (sessions, snapshots, v0.1 events, export) remains in place.

---

## Development Milestones

> Updated by agent after each substantial milestone. Do not edit manually unless correcting history.

| Milestone | Status | Date | Notes |
|-----------|--------|------|-------|
| Master context + project scaffolding | ✅ Done | 2026-05-31 | MASTER_CONTEXT.md, cursor rules |
| Plasmo extension scaffold | ✅ Done | 2026-05-31 | Plasmo + React + TS, src/ layout |
| LeetCode content script injection | ✅ Done | 2026-05-31 | CSUI sidebar on `/problems/*` |
| Session start/stop lifecycle | ✅ Done | 2026-05-31 | Auto start/end on navigation |
| Event collection pipeline | ✅ Done | 2026-05-31 | 4 event types via DOM observers |
| Snapshot collection | ✅ Done | 2026-05-31 | Monaco editor capture on triggers |
| Local storage + session JSON export | ✅ Done | 2026-05-31 | chrome.storage.local + export btn |
| v0.1 complete — session reconstruction proven | ✅ Done | 2026-06-01 | Live Two Sum session: OPEN/RUN/SUBMIT + export validated |
| v0.2 Signal Layer | ✅ Done | 2026-06-01 | 10 signal features + attemptHistory + timeline util |
| v0.2.1 Observer Stabilization | ✅ Done | 2026-06-03 | Periodic snapshots, hashing, metrics, result hardening |
| v0.3 Behavioral Signal Engine | ✅ Done | 2026-06-01 | 17 signals, confidence/evidence, SessionAnalysis, behavior report |
| v0.3.1 Premium UI | ✅ Done | 2026-06-01 | Floating pill sidebar, shadcn amber-minimal, Learning Insights |
| Alpha Distribution Infrastructure | ✅ Done | 2026-06-01 | User ID, export metadata, consent, docs |
| v0.3.1 Result Extraction | ✅ Done | 2026-06-01 | errorText, failed testcase, semantic DOM, confidence v2 |
| v0.3.1.2 Panel-Scoped Extraction | ✅ Done | 2026-06-01 | `.flexlayout__tab` + console-result locator; no global DOM scan |
| v0.3.2 Panel Model Architecture | ✅ Done | 2026-06-01 | PanelModel → normalizePanelModel; 3-layer extraction |
| v0.3.1 Wrong Answer Extraction | ✅ Done | 2026-06-01 | failedInput/actualOutput/expectedOutput verified; Input uses `.font-menlo` selector |
| v0.3.1 Extraction Layer Freeze | ✅ Done | 2026-06-01 | Accepted metrics + submit panel validated; temp debug logs removed |
| v0.3.1-alpha Validation | ✅ Done | 2026-06-01 | Multi-session/device/user organic validation complete |
| v0.3.2 Learning Source Tracking | ✅ Done | 2026-06-01 | OPEN/CLOSE events, learningSources aggregation, learningSourceVisits export |
| v0.4.1 Analytics Architecture | ✅ Done | 2026-06-01 | `src/analytics/` scaffolds, session-analysis-export types, thresholds |
| v0.4.2 Replay + Features | ✅ Done | 2026-06-01 | ReplayGenerator + FeatureExtractor (solving/debugging/rewrites/learning) |
| v0.4.2 Analytics Test Harness | ✅ Done | 2026-06-01 | `npm run analytics:test` on exported session JSON fixtures |
| v0.4.3 Classification + Snapshots | ✅ Done | 2026-06-01 | Deterministic labels + snapshot similarity metrics |
| v0.4.4 Analysis Export Layer | ✅ Done | 2026-06-01 | `{ metadata, session, analysis }` export payload |
| Clerk Auth + Stable CRX ID | ✅ Done | 2026-06-27 | `@clerk/chrome-extension`, RSA keypair, manifest `key`, Account card |
| v0.5 Backend + Auth + Auto-Sync | 🔄 In progress | 2026-06-01 | JWT bridge, sync service, FastAPI + Supabase ingestion |
| v0.6 Problem Metadata Layer | 🔄 In progress | 2026-06-01 | GraphQL topic tags, `topicTags`/`leetcodeId` on session, problems upsert on sync |

**Next up:** v0.6 verification — Two Sum export shows topic tags; Supabase `problems` + `sessions` populated

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-01 | v0.6 (in progress): LeetCode GraphQL `fetchProblemMetadata`, session `topicTags`/`leetcodeId`, backend problems+sessions topic_tags upsert |
| 2026-06-01 | v0.5 (in progress): `LEETEX_GET_TOKEN`, `SyncService`, Clerk userId in export, FastAPI backend scaffold |
| 2026-06-27 | Clerk auth: stable CRX ID via RSA keypair; `CRX_PUBLIC_KEY` in `.env.chrome` / `.env.development` |
| 2026-06-01 | v0.4.4: returning session detection — `isReturningSession` flag; null `timeToFirstEdit` when editor had prior code |
| 2026-06-01 | v0.4.4: analytics solving timings documented as milliseconds (distinct from `session.metrics` seconds) |
| 2026-06-01 | v0.4.4: Monaco code extraction via `.inputarea` textarea — fixes scrambled scroll snapshots |
| 2026-06-01 | v0.4.4: analysis embedded in export payload — SessionAnalyticsEngine runs at export time |
| 2026-06-01 | v0.4.3: ClassificationEngine + SnapshotAnalytics — deterministic session labels |
| 2026-06-01 | v0.4.2: analytics test harness — `scripts/test-analytics.ts` + fixture folder mode |
| 2026-06-01 | Reliability: 30min session inactivity timeout + getEffectiveEndTime for analytics duration |
| 2026-06-01 | v0.4.2: ReplayGenerator + FeatureExtractor — pure event/attempt derivation |
| 2026-06-01 | v0.4.1: analytics layer scaffold — types, thresholds, empty engines (BehavioralSignalEngine untouched) |
| 2026-06-01 | v0.3.2: learningSourceVisits — per open→close windows on session export |
| 2026-06-01 | v0.3.2: learning source tracking — Editorial/Solutions/Discussion OPEN/CLOSE + learningSources |
| 2026-06-01 | v0.3.1-alpha: extraction validated; investigation console.log removed; observer frozen |
| 2026-06-01 | v0.3.1: Wrong Answer extraction closed — Input `.font-menlo` fix; passed/total optional in diagnostics |
| 2026-06-01 | v0.3.2: 3-layer result extraction — panel discovery, PanelModel, normalizePanelModel |
| 2026-06-01 | v0.3.1.2: panel-scoped extraction — flexlayout tab + console-result; Last Executed Input |
| 2026-06-01 | v0.3.1.1: result extraction hardening — errorCategory, panel root discovery, no early finish |
| 2026-06-01 | v0.3.1: result extraction — errorText, failed testcase fields, semantic DOM, confidence v2 |
| 2026-06-01 | Alpha: UserIdentityService, export metadata, consent flow, INSTALLATION/PRIVACY/CHANGELOG |
| 2026-06-01 | v0.3.1: Premium floating sidebar UI — shadcn amber-minimal, Learning Insights |
| 2026-06-01 | v0.3: BehavioralSignalEngine, 17 signal rules, SessionAnalysis, generateBehaviorReport |
| 2026-06-03 | v0.2.1: periodic snapshots, SHA-256 hash, similarity, metrics, result confidence/sourcePanel |
| 2026-06-03 | Result extraction pipeline: MutationObserver + multi-strategy DOM parsing + debug mode |
| 2026-06-01 | v0.2 Signal Layer: behavioral events, idle/rewrite/language, results, attemptHistory, timeline |
| 2026-06-01 | v0.1 marked complete; polish: language detect, delayed start snapshot, title strip |
| 2026-05-31 | v0.1 Observer extension built: session tracking, events, snapshots, storage, sidebar UI |
| 2026-05-31 | Initial master context created. v0.1 milestone tracker seeded. |
