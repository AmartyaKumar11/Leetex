# Learning Source Tracking — Test Checklist (v0.3.2)

Enable `LEETEX_DEBUG_OBSERVER=true` optional. Export JSON after each scenario.

---

## 1. Editorial

1. Open a problem (code editor)
2. Click **Editorial** tab
3. Wait ~10 seconds
4. Return to **Description** / **Code** tab

**Verify events:**

- `EDITORIAL_OPENED`
- `EDITORIAL_CLOSED` with `metadata.durationMs` ≈ 10000 (±3s)

**Verify aggregation:**

```json
"learningSources": {
  "editorial": { "visits": 1, "timeMs": ~10000 }
}
```

---

## 2. Solutions

1. Open **Solutions** tab
2. Wait ~5 seconds
3. Return to editor

**Verify:**

- `SOLUTION_OPENED`
- `SOLUTION_CLOSED` with `durationMs`

---

## 3. Discussion

1. Open **Discussion** tab
2. Wait ~5 seconds
3. Return to editor

**Verify:**

- `DISCUSSION_OPENED`
- `DISCUSSION_CLOSED` with `durationMs`

---

## 4. Multiple visits (Editorial)

1. Editorial → wait 5s → Editor
2. Editorial → wait 5s → Editor

**Verify:**

- `visits`: 2
- `timeMs`: sum of both closed durations
- 2× `EDITORIAL_OPENED`, 2× `EDITORIAL_CLOSED`

---

## 5. Cross navigation

1. Editorial → Discussion → Solutions → Editor

**Verify:**

- Each segment emits OPEN for new tab + CLOSE for previous
- No overlapping active sources (only one OPEN without matching CLOSE at a time)
- Order: `EDITORIAL_OPENED` → `EDITORIAL_CLOSED` → `DISCUSSION_OPENED` → …

---

## 6. Session end cleanup

1. Open Editorial
2. Navigate away from problem (or close tab / export+end session)

**Verify:**

- `EDITORIAL_CLOSED` emitted automatically
- `metadata.trigger` may be `session_end`
- No dangling open without close in `session.events`

---

## 7. Export verification

Export session JSON. Confirm:

- [ ] `session.events` contains OPEN/CLOSE pairs
- [ ] CLOSE events have `durationMs`
- [ ] `session.learningSources.editorial.visits` matches OPEN count
- [ ] `session.learningSources.*.timeMs` matches sum of CLOSE durations
- [ ] Timeline shows learning source entries (optional UI check)

---

## 8. Organic validation

Repeat full checklist on **≥3 real sessions** across different problems/devices before marking v0.3.2 complete.

---

## Completion criteria

- [ ] Editorial tracking works
- [ ] Solutions tracking works
- [ ] Discussion tracking works
- [ ] Durations recorded
- [ ] Multiple visits handled
- [ ] Session-end cleanup works
- [ ] Export verified
- [ ] 3+ organic sessions tested
