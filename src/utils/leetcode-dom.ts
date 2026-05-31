import type { Difficulty } from "~/types/session"

const PROBLEM_PATH_PATTERN = /\/problems\/([^/]+)/

const TITLE_SELECTORS = [
  '[data-cy="question-title"]',
  'a[href*="/problems/"][class*="text-title"]',
  'div[class*="text-title-large"] a',
  'div[class*="text-title-large"]',
  ".text-title-large"
] as const

const DIFFICULTY_SELECTORS = [
  "[diff]",
  '[class*="difficulty"]',
  '[class*="Difficulty"]',
  '[data-difficulty]'
] as const

const RUN_BUTTON_LOCATORS = ["run-code-btn", "console-run-button"] as const

const SUBMIT_BUTTON_LOCATORS = ["submit-code-btn", "console-submit-button"] as const

type MonacoEditor = {
  getValue: () => string
  getModel?: () => { getLanguageId: () => string } | null
}

type MonacoGlobal = {
  editor?: {
    getEditors?: () => MonacoEditor[]
  }
}

export function extractQuestionSlug(): string | null {
  const match = location.pathname.match(PROBLEM_PATH_PATTERN)
  return match?.[1] ?? null
}

export function isLeetCodeProblemUrl(url = location.href): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === "leetcode.com" &&
      PROBLEM_PATH_PATTERN.test(parsed.pathname)
    )
  } catch {
    return false
  }
}

export function isEditorialUrl(url = location.href): boolean {
  try {
    const parsed = new URL(url)
    return parsed.pathname.includes("/editorial")
  } catch {
    return false
  }
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function normalizeDifficulty(value: string | null | undefined): Difficulty | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (normalized.includes("easy")) {
    return "Easy"
  }

  if (normalized.includes("medium")) {
    return "Medium"
  }

  if (normalized.includes("hard")) {
    return "Hard"
  }

  return null
}

export function extractQuestionTitle(): string | null {
  for (const selector of TITLE_SELECTORS) {
    const element = document.querySelector(selector)

    if (element?.textContent?.trim()) {
      return cleanTitle(element.textContent)
    }
  }

  const slug = extractQuestionSlug()
  return slug ? slugToTitle(slug) : null
}

export function extractDifficulty(): Difficulty | null {
  for (const selector of DIFFICULTY_SELECTORS) {
    const element = document.querySelector(selector)

    if (!element) {
      continue
    }

    const attributeDifficulty =
      element.getAttribute("diff") ??
      element.getAttribute("data-difficulty") ??
      element.textContent

    const normalized = normalizeDifficulty(attributeDifficulty)

    if (normalized) {
      return normalized
    }
  }

  const titleRegion = document.querySelector('[data-track-load="description_content"]')

  if (titleRegion?.textContent) {
    const match = titleRegion.textContent.match(/\b(Easy|Medium|Hard)\b/i)
    return normalizeDifficulty(match?.[1])
  }

  return null
}

export function extractEditorState(): { code: string; language: string | null } {
  const monaco = (window as Window & { monaco?: MonacoGlobal }).monaco
  const editors = monaco?.editor?.getEditors?.()

  if (editors?.length) {
    const editor = editors[0]
    const code = editor.getValue() ?? ""
    const language = editor.getModel?.()?.getLanguageId() ?? null

    return { code, language }
  }

  const codeMirror = document.querySelector(".CodeMirror") as
    | (HTMLElement & { CodeMirror?: { getValue: () => string } })
    | null

  if (codeMirror?.CodeMirror) {
    return {
      code: codeMirror.CodeMirror.getValue() ?? "",
      language: null
    }
  }

  const viewLines = document.querySelector(".view-lines")

  if (viewLines?.textContent) {
    return {
      code: viewLines.textContent.replace(/\u00a0/g, " ").trim(),
      language: null
    }
  }

  return { code: "", language: null }
}

export function isRunCodeButton(element: Element | null): boolean {
  return matchesActionButton(element, RUN_BUTTON_LOCATORS, ["run"])
}

export function isSubmitButton(element: Element | null): boolean {
  return matchesActionButton(element, SUBMIT_BUTTON_LOCATORS, ["submit"])
}

export function isEditorialTrigger(element: Element | null): boolean {
  if (!element) {
    return false
  }

  const text = element.textContent?.trim().toLowerCase() ?? ""
  const href = element.getAttribute("href")?.toLowerCase() ?? ""

  return text === "editorial" || href.includes("/editorial")
}

export function waitForQuestionMetadata(
  maxAttempts: number,
  intervalMs: number
): Promise<{ title: string; difficulty: Difficulty | null; slug: string }> {
  return new Promise((resolve, reject) => {
    let attempts = 0

    const poll = () => {
      attempts += 1

      const slug = extractQuestionSlug()
      const title = extractQuestionTitle()
      const difficulty = extractDifficulty()

      if (slug && title) {
        resolve({ title, difficulty, slug })
        return
      }

      if (attempts >= maxAttempts) {
        reject(new Error("Timed out waiting for LeetCode question metadata"))
        return
      }

      window.setTimeout(poll, intervalMs)
    }

    poll()
  })
}

function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

function matchesActionButton(
  element: Element | null,
  locators: readonly string[],
  labels: readonly string[]
): boolean {
  const button = element?.closest("button")

  if (!button) {
    return false
  }

  const locator = button.getAttribute("data-e2e-locator")

  if (locator && locators.includes(locator)) {
    return true
  }

  const text = button.textContent?.trim().toLowerCase() ?? ""
  return labels.some((label) => text === label || text.startsWith(`${label} `))
}
