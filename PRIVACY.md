# Privacy Policy (Alpha)

**Last updated:** June 2026  
**Applies to:** LeetEx Chrome Extension v0.3.0-alpha

This document explains what LeetEx collects, what it does not collect, and how your data is handled during the Alpha program.

---

## Summary

- LeetEx runs **entirely on your device**
- **No automatic uploads** — ever
- **No cloud storage** — ever
- **No accounts or authentication** in Alpha
- You control every export manually

---

## What Data Is Collected

While you use LeetCode with LeetEx enabled, the extension records:

| Data | Purpose |
|------|---------|
| **Code snapshots** | Reconstruct your solving journey |
| **Session events** | Edits, runs, submits, language changes, idle periods |
| **Run/submit outcomes** | Pass/fail status, test case counts (when visible in DOM) |
| **Problem metadata** | Title, slug, difficulty |
| **Session metrics** | Time to first edit, run counts, duration |
| **Behavioral insights** | Derived locally from session data (no AI) |
| **Installation User ID** | UUID v4 stored locally to trace exports |

All of the above stays in **Chrome local storage** on your machine until you export or uninstall.

---

## What Is NOT Collected

LeetEx Alpha does **not**:

- Upload data to any server
- Connect to a backend or database
- Use AI/LLM services
- Collect your LeetCode username or password
- Access pages outside `leetcode.com/problems/*`
- Track browsing history outside LeetCode problems
- Share data with third parties

---

## User Identity

On first install, LeetEx generates a random **UUID v4** (`userId`) and stores it in `chrome.storage.local`.

This ID:

- Persists across browser sessions
- Is included in manual exports
- Helps Alpha researchers group sessions from the same tester
- Is **not** linked to your real identity unless you choose to share it

You can copy your User ID from **About LeetEx** in the sidebar.

---

## How Exports Work

When you click **Export Session**:

1. LeetEx validates user ID, version, and session data
2. A JSON file is created on your device
3. Your browser downloads the file locally

Export format:

```json
{
  "metadata": {
    "userId": "...",
    "leetexVersion": "0.3.0-alpha",
    "exportedAt": "...",
    "browser": "Chrome",
    "platform": "leetcode"
  },
  "session": { ... }
}
```

**You decide** whether to send export files to the Alpha program. LeetEx will never send them for you.

---

## Consent

On first launch, LeetEx shows a consent screen explaining what is recorded. You must click **I Understand** before using the extension. This preference is stored locally and the modal is not shown again.

---

## Data Retention

| Location | Retention |
|----------|-----------|
| Active session | Until you leave the problem page |
| Session history | Stored locally until cleared or extension uninstalled |
| User ID | Until extension uninstalled |
| Exported JSON files | You control — on your filesystem |

Uninstalling LeetEx removes extension storage from Chrome.

---

## Alpha Program

Alpha testers may voluntarily share exported JSON files with the maintainer for research purposes. If you participate:

- Only share exports you intend to contribute
- Your `userId` will be visible in shared files
- Do not share exports containing code you consider proprietary if your employer restricts it

Contact the project maintainer for questions about Alpha data handling.

---

## Changes

This policy may be updated as LeetEx moves beyond Alpha. Material changes will be noted in [CHANGELOG.md](./CHANGELOG.md).

---

## Contact

For privacy questions during Alpha, contact the repository maintainer via the channel provided for your testing cohort.
