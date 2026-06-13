# Installation Guide

This guide walks you through installing LeetEx from source for Alpha testing.

**Requirements:**

- Node.js 18+ and npm
- Google Chrome (or Chromium-based browser with extension support)
- A LeetCode account

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/leetex.git
cd leetex
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Build the Extension

**Production build (recommended for Alpha testers):**

```bash
npm run build
```

Output: `build/chrome-mv3-prod/`

**Development build (for contributors):**

```bash
npm run dev
```

Output: `build/chrome-mv3-dev/` (includes hot reload)

---

## 4. Load Unpacked Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the build folder:
   - Production: `build/chrome-mv3-prod`
   - Development: `build/chrome-mv3-dev`
5. Pin LeetEx in the extensions toolbar if desired

---

## 5. First Launch

1. Navigate to any LeetCode problem, e.g.  
   `https://leetcode.com/problems/two-sum/`
2. A **consent modal** appears on first use — read and click **I Understand**
3. A small **LX** pill appears on the left edge — click to open the panel
4. Your unique **User ID** is shown under **About LeetEx**

---

## 6. Verify It Works

1. Open a problem
2. Make an edit and run your code
3. Open the LeetEx panel — you should see session stats and timeline entries
4. Click **Export Session** — a JSON file downloads

Check the export includes:

```json
"metadata": {
  "userId": "...",
  "leetexVersion": "0.3.0-alpha",
  ...
}
```

---

## Updating

When a new Alpha version is released:

```bash
git pull
npm install
npm run build
```

Then go to `chrome://extensions` and click the **Reload** button on LeetEx.

Your User ID persists across updates.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Sidebar not visible | Hard refresh LeetCode (`Ctrl+Shift+R`) |
| Export fails | Reload extension; check About → User ID exists |
| Session not starting | Confirm URL matches `leetcode.com/problems/*` |
| Build errors | Run `npm install` again; use Node 18+ |

---

## Debug Modes (Optional)

In the LeetCode page console:

```javascript
localStorage.setItem("LEETEX_DEBUG_OBSERVER", "true")
localStorage.setItem("LEETEX_DEBUG_RESULTS", "true")
```

Reload the page after enabling.

---

## Sending Session Data

Alpha testers export sessions manually and send JSON files to the project maintainer (e.g. via secure channel agreed upon for the Alpha program).

LeetEx never uploads automatically.
