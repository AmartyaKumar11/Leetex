# LeetEx - Master Context

> **Last updated:** 2026-06-03  
> **Current phase:** v0.2.1 — Observer Stabilization  
> **Status:** Periodic snapshots, hashing, metrics, hardened result extraction

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
| Version | v0.2.1 |
| Codename | Observer Stabilization |
| Goal | Higher-quality captured data before Behavioral Signal Engine (v0.3) |

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

**Next up:** v0.3 Behavioral Signal Engine planning

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-03 | v0.2.1: periodic snapshots, SHA-256 hash, similarity, metrics, result confidence/sourcePanel |
| 2026-06-03 | Result extraction pipeline: MutationObserver + multi-strategy DOM parsing + debug mode |
| 2026-06-01 | v0.2 Signal Layer: behavioral events, idle/rewrite/language, results, attemptHistory, timeline |
| 2026-06-01 | v0.1 marked complete; polish: language detect, delayed start snapshot, title strip |
| 2026-05-31 | v0.1 Observer extension built: session tracking, events, snapshots, storage, sidebar UI |
| 2026-05-31 | Initial master context created. v0.1 milestone tracker seeded. |
