import type { Difficulty } from "~/types/session"
import type { LearningSourceId, LearningSourceView } from "~/types/learning-source"
import { observerDebugLog } from "~/utils/observer-debug"

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
  return detectLearningSourceFromUrl(url) === "editorial"
}

const TAB_LABEL_TO_VIEW: Record<string, LearningSourceView> = {
  editorial: "editorial",
  solutions: "solutions",
  solution: "solutions",
  discussion: "discussion",
  discuss: "discussion",
  description: "editor",
  code: "editor"
}

export function detectLearningSourceFromUrl(url = location.href): LearningSourceView | null {
  if (!isLeetCodeProblemUrl(url)) {
    return null
  }

  try {
    const path = new URL(url).pathname

    if (path.includes("/editorial")) {
      return "editorial"
    }

    if (path.includes("/solution")) {
      return "solutions"
    }

    if (path.includes("/discuss")) {
      return "discussion"
    }

    if (PROBLEM_PATH_PATTERN.test(path)) {
      return "editor"
    }
  } catch {
    return null
  }

  return null
}

export function detectLearningSourceFromTab(element: Element | null): LearningSourceView | null {
  if (!element) {
    return null
  }

  const tab = element.closest("a, button, [role='tab']") ?? element
  const text = tab.textContent?.trim().toLowerCase() ?? ""
  const href = tab.getAttribute("href")?.toLowerCase() ?? ""

  if (href.includes("/editorial")) {
    return "editorial"
  }

  if (href.includes("/solution")) {
    return "solutions"
  }

  if (href.includes("/discuss")) {
    return "discussion"
  }

  const firstWord = text.split(/\s+/)[0] ?? ""

  return TAB_LABEL_TO_VIEW[firstWord] ?? TAB_LABEL_TO_VIEW[text] ?? null
}

export function detectActiveLearningSourceTab(): LearningSourceView | null {
  const selected =
    document.querySelector('[role="tab"][aria-selected="true"]') ??
    document.querySelector('[role="tab"][data-state="active"]')

  if (!selected) {
    return null
  }

  return detectLearningSourceFromTab(selected)
}

export function detectLearningSourceView(url = location.href): LearningSourceView | null {
  const fromUrl = detectLearningSourceFromUrl(url)

  if (fromUrl && fromUrl !== "editor") {
    return fromUrl
  }

  const fromTab = detectActiveLearningSourceTab()

  if (fromTab) {
    return fromTab
  }

  return fromUrl
}

export function isEditorialTrigger(element: Element | null): boolean {
  return detectLearningSourceFromTab(element) === "editorial"
}

export function isLearningSourceTab(element: Element | null): LearningSourceView | null {
  return detectLearningSourceFromTab(element)
}

export function isLearningSourceId(view: LearningSourceView): view is LearningSourceId {
  return view === "editorial" || view === "solutions" || view === "discussion"
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
  const monacoState = extractMonacoEditorState()
  const code = monacoState?.code ?? extractCodeFromDom()
  const language =
    monacoState?.language ?? extractSelectedLanguage() ?? inferLanguageFromCode(code)

  return { code, language }
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

export interface ProblemMetadata {
  questionId: string | null
  title: string
  slug: string
  difficulty: string | null
  topicTags: string[]
}

export async function fetchProblemMetadata(slug: string): Promise<ProblemMetadata | null> {
  try {
    observerDebugLog("fetchProblemMetadata: starting", { slug })

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/problems/${slug}/`
      },
      body: JSON.stringify({
        query: `
          query getProblemMetadata($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionId
              title
              difficulty
              topicTags {
                name
                slug
              }
            }
          }
        `,
        variables: { titleSlug: slug }
      })
    })

    observerDebugLog("fetchProblemMetadata: response status", {
      status: response.status,
      ok: response.ok
    })

    if (!response.ok) {
      observerDebugLog("fetchProblemMetadata: response not ok")
      return null
    }

    const data = await response.json()
    observerDebugLog("fetchProblemMetadata: data received", { data })

    const question = data?.data?.question

    if (!question) {
      observerDebugLog("fetchProblemMetadata: question is null in response")
      return null
    }

    const result = {
      questionId: question.questionId ?? null,
      title: question.title,
      slug,
      difficulty: question.difficulty ?? null,
      topicTags: (question.topicTags ?? []).map((t: { name: string }) => t.name)
    }

    observerDebugLog("fetchProblemMetadata: success", result)
    return result
  } catch (e) {
    observerDebugLog("fetchProblemMetadata: caught error", { error: String(e) })
    return null
  }
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMonacoEditorState(): { code: string; language: string | null } | null {
  const win = window as Window & {
    monaco?: MonacoGlobal
    lcMonaco?: MonacoGlobal
  }
  const monacoNamespace = win.monaco ?? win.lcMonaco ?? null

  if (!monacoNamespace) {
    return null
  }

  try {
    const editors = monacoNamespace.editor?.getEditors?.() ?? []

    if (editors.length === 0) {
      return null
    }

    let editor: MonacoEditor | null = null
    let longestCode = 0

    for (const candidate of editors) {
      if (typeof candidate.getValue !== "function") {
        continue
      }

      const length = candidate.getValue().length

      if (length > longestCode) {
        longestCode = length
        editor = candidate
      }
    }

    if (!editor) {
      return null
    }

    const code = editor.getValue()

    if (!code || code.trim().length === 0) {
      return null
    }

    const model = editor.getModel?.()
    const languageId = model?.getLanguageId?.() ?? null

    observerDebugLog("Monaco Extraction: success via lcMonaco", {
      length: code.length,
      language: languageId,
      editorCount: editors.length
    })

    return { code, language: normalizeLanguageLabel(languageId) }
  } catch (e) {
    observerDebugLog("Monaco Extraction: failed", { error: String(e) })
    return null
  }
}

function extractCodeFromDom(): string {
  const viewLineEls = document.querySelectorAll(".view-lines .view-line")

  if (viewLineEls.length > 0) {
    const lines = Array.from(viewLineEls)
      .map((el) => ({
        top: parseFloat((el as HTMLElement).style.top) || 0,
        text: el.textContent ?? ""
      }))
      .sort((a, b) => a.top - b.top)
      .map((l) => l.text)

    const code = lines.join("\n").replace(/\u00a0/g, " ").trim()

    if (code.length > 0) {
      observerDebugLog("DOM Extraction: success via sorted view-lines", {
        lineCount: lines.length,
        length: code.length
      })
      return code
    }
  }

  const textarea = document.querySelector<HTMLTextAreaElement>(".monaco-editor .inputarea")

  if (textarea?.value && textarea.value.trim().length > 0) {
    observerDebugLog("DOM Extraction: fallback to textarea", {
      length: textarea.value.length
    })
    return textarea.value
  }

  observerDebugLog("DOM Extraction: all strategies failed")
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
