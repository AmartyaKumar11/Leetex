# Learning Source DOM Detection (v0.3.2)

Investigation summary for LeetCode problem-page learning tabs.

## Detection strategy

LeetEx uses a **two-layer** approach:

1. **URL path** (primary when route changes)
2. **Tab label + `aria-selected`** (fallback for in-page SPA tab switches)

No brittle Tailwind class names are used for identification.

---

## URL patterns

| Source | Path signal | Example |
|--------|-------------|---------|
| Editorial | `/editorial` in pathname | `/problems/two-sum/editorial/` |
| Solutions | `/solution` in pathname | `/problems/two-sum/solutions/` |
| Discussion | `/discuss` in pathname | `/problems/two-sum/discuss/` |
| Editor (code) | `/problems/{slug}` without above segments | `/problems/two-sum/` |

Implementation: `detectLearningSourceFromUrl()` in `src/utils/leetcode-dom.ts`

---

## Tab labels (visible text)

| Tab text | Mapped view |
|----------|-------------|
| Editorial | `editorial` |
| Solutions / Solution | `solutions` |
| Discussion / Discuss | `discussion` |
| Description / Code | `editor` |

Matched on:

- `element.textContent` (first word or full label)
- `href` containing `/editorial`, `/solution`, `/discuss`

Implementation: `detectLearningSourceFromTab()`

---

## Active tab (SPA fallback)

When URL stays on `/problems/{slug}` but tab changes:

```html
[role="tab"][aria-selected="true"]
[role="tab"][data-state="active"]
```

`MutationObserver` watches `aria-selected` and `data-state` on `document.body`.

Implementation: `detectActiveLearningSourceTab()` + observer in `leetcode-session-observer.ts`

---

## Open / close rules

| Transition | Events |
|------------|--------|
| Editor → Editorial | `EDITORIAL_OPENED` |
| Editorial → Editor | `EDITORIAL_CLOSED` + `durationMs` |
| Editorial → Discussion | `EDITORIAL_CLOSED` then `DISCUSSION_OPENED` |
| Session end while open | `*_CLOSED` with `durationMs` |

Only one learning source active at a time.

---

## What we do NOT infer

- Learning quality
- Copying vs understanding
- Dependency scores
- Skill level

Behavior capture only. Analysis is a future layer.
