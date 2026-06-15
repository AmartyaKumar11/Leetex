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

const LANGUAGE_BUTTON_SELECTORS = [
  'button[data-e2e-locator*="lang"]',
  '[class*="lang-select"] button',
  '[class*="LanguageSelector"] button',
  '[class*="language-select"] button'
] as const

const LANGUAGE_LABEL_MAP: Record<string, string> = {
  bash: "bash",
  c: "c",
  "c#": "csharp",
  "c++": "cpp",
  cpp: "cpp",
  dart: "dart",
  elixir: "elixir",
  erlang: "erlang",
  go: "go",
  golang: "go",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  kotlin: "kotlin",
  mysql: "mysql",
  php: "php",
  python: "python",
  python3: "python",
  python2: "python",
  racket: "racket",
  ruby: "ruby",
  rust: "rust",
  scala: "scala",
  swift: "swift",
  typescript: "typescript",
  ts: "typescript"
}

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

export function extractEditorState(): {
  code: string
  language: string | null
  source: "monaco" | "codemirror" | "view-lines" | "empty"
  monacoAvailable: boolean
  monacoEditorCount: number
} {
  const monacoState = extractMonacoEditorState()
  const monaco = (window as Window & { monaco?: MonacoGlobal }).monaco
  const monacoEditors = monaco?.editor?.getEditors?.() ?? []
  const monacoAvailable = Boolean(monaco?.editor?.getEditors)

  if (monacoState) {
    return {
      code: monacoState.code,
      language:
        monacoState.language ??
        extractSelectedLanguage() ??
        inferLanguageFromCode(monacoState.code),
      source: "monaco",
      monacoAvailable,
      monacoEditorCount: monacoEditors.length
    }
  }

  const codeMirror = document.querySelector(".CodeMirror") as
    | (HTMLElement & { CodeMirror?: { getValue: () => string } })
    | null

  if (codeMirror?.CodeMirror) {
    const code = codeMirror.CodeMirror.getValue() ?? ""

    return {
      code,
      language: extractSelectedLanguage() ?? inferLanguageFromCode(code),
      source: "codemirror",
      monacoAvailable,
      monacoEditorCount: monacoEditors.length
    }
  }

  const viewLines = document.querySelector(".view-lines")

  if (viewLines?.textContent) {
    const code = viewLines.textContent.replace(/\u00a0/g, " ").trim()

    return {
      code,
      language: extractSelectedLanguage() ?? inferLanguageFromCode(code),
      source: "view-lines",
      monacoAvailable,
      monacoEditorCount: monacoEditors.length
    }
  }

  return {
    code: "",
    language: extractSelectedLanguage() ?? null,
    source: "empty",
    monacoAvailable,
    monacoEditorCount: monacoEditors.length
  }
}

export function waitForEditorState(
  maxAttempts: number,
  intervalMs: number
): Promise<{ code: string; language: string | null }> {
  return new Promise((resolve) => {
    let attempts = 0

    const poll = () => {
      attempts += 1
      const state = extractEditorState()

      if (state.code.length > 0 || state.language) {
        resolve(state)
        return
      }

      if (attempts >= maxAttempts) {
        resolve(state)
        return
      }

      window.setTimeout(poll, intervalMs)
    }

    poll()
  })
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
  return raw
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMonacoEditorState(): { code: string; language: string | null } | null {
  const monaco = (window as Window & { monaco?: MonacoGlobal }).monaco
  const editors = monaco?.editor?.getEditors?.()

  if (!editors?.length) {
    return null
  }

  const editor = editors[0]
  const code = editor.getValue() ?? ""
  const language = normalizeLanguageLabel(editor.getModel?.()?.getLanguageId() ?? null)

  return { code, language }
}

function extractCodeFromDom(): string {
  const codeMirror = document.querySelector(".CodeMirror") as
    | (HTMLElement & { CodeMirror?: { getValue: () => string } })
    | null

  if (codeMirror?.CodeMirror) {
    return codeMirror.CodeMirror.getValue() ?? ""
  }

  const viewLines = document.querySelector(".view-lines")

  if (viewLines?.textContent) {
    return viewLines.textContent.replace(/\u00a0/g, " ").trim()
  }

  return ""
}

function extractSelectedLanguage(): string | null {
  for (const selector of LANGUAGE_BUTTON_SELECTORS) {
    for (const element of document.querySelectorAll(selector)) {
      const language = normalizeLanguageLabel(element.textContent)

      if (language) {
        return language
      }
    }
  }

  const codePanel =
    document.querySelector('[data-e2e-locator="code-editor"]') ??
    document.querySelector('[class*="editor-container"]') ??
    document.querySelector('[class*="CodeEditor"]')

  if (codePanel) {
    for (const button of codePanel.querySelectorAll("button")) {
      const language = normalizeLanguageLabel(button.textContent)

      if (language) {
        return language
      }
    }
  }

  return null
}

function normalizeLanguageLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  return LANGUAGE_LABEL_MAP[normalized] ?? null
}

function inferLanguageFromCode(code: string): string | null {
  if (!code.trim()) {
    return null
  }

  if (/class Solution:\s*\n|def twoSum|List\[int\]|enumerate\(/.test(code)) {
    return "python"
  }

  if (/vector<|class Solution\s*\{|public:\s*$|std::/.test(code)) {
    return "cpp"
  }

  if (/public class Solution|int\[\] nums/.test(code)) {
    return "java"
  }

  if (/function twoSum|const twoSum|=>/.test(code)) {
    return "javascript"
  }

  return null
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
