import { RESULT_STATUSES, type ResultMetadata, type ResultStatus } from "~/types/results"

const RESULT_PANEL_SELECTORS = [
  '[data-e2e-locator="console-result"]',
  '[class*="result"]',
  '[class*="Result"]',
  '[class*="submit-result"]',
  '[class*="SubmitResult"]',
  ".ant-alert-message",
  '[role="alert"]'
] as const

const STATUS_PATTERNS: { status: ResultStatus | string; pattern: RegExp }[] = [
  { status: "Accepted", pattern: /\baccepted\b/i },
  { status: "Wrong Answer", pattern: /\bwrong answer\b/i },
  { status: "Runtime Error", pattern: /\bruntime error\b/i },
  { status: "Time Limit Exceeded", pattern: /\btime limit exceeded\b/i },
  { status: "Memory Limit Exceeded", pattern: /\bmemory limit exceeded\b/i },
  { status: "Compilation Error", pattern: /\bcompilation error\b/i }
]

const PASSED_TOTAL_PATTERN =
  /(\d+)\s*\/\s*(\d+)|(\d+)\s+of\s+(\d+)|passed[:\s]+(\d+).*?total[:\s]+(\d+)/i

export function extractRunOrSubmitResult(): ResultMetadata | null {
  const text = collectResultPanelText()

  if (!text) {
    return null
  }

  const status = parseStatus(text)

  if (!status) {
    return null
  }

  const { passed, total } = parsePassedTotal(text)

  return { status, passed, total }
}

function collectResultPanelText(): string {
  const chunks: string[] = []

  for (const selector of RESULT_PANEL_SELECTORS) {
    for (const element of document.querySelectorAll(selector)) {
      const text = element.textContent?.trim()

      if (text && text.length > 0 && text.length < 2000) {
        chunks.push(text)
      }
    }
  }

  const testResultTab = document.querySelector('[data-e2e-locator="console-result"]')

  if (testResultTab?.textContent) {
    chunks.push(testResultTab.textContent)
  }

  return [...new Set(chunks)].join("\n")
}

function parseStatus(text: string): ResultStatus | string | null {
  for (const { status, pattern } of STATUS_PATTERNS) {
    if (pattern.test(text)) {
      return status
    }
  }

  for (const known of RESULT_STATUSES) {
    if (text.toLowerCase().includes(known.toLowerCase())) {
      return known
    }
  }

  return null
}

function parsePassedTotal(text: string): {
  passed: number | null
  total: number | null
} {
  const slashMatch = text.match(/(\d+)\s*\/\s*(\d+)/)

  if (slashMatch) {
    return {
      passed: Number(slashMatch[1]),
      total: Number(slashMatch[2])
    }
  }

  const ofMatch = text.match(/(\d+)\s+of\s+(\d+)/i)

  if (ofMatch) {
    return {
      passed: Number(ofMatch[1]),
      total: Number(ofMatch[2])
    }
  }

  const verboseMatch = PASSED_TOTAL_PATTERN.exec(text)

  if (verboseMatch) {
    const passed = Number(verboseMatch[1] ?? verboseMatch[3] ?? verboseMatch[5])
    const total = Number(verboseMatch[2] ?? verboseMatch[4] ?? verboseMatch[6])

    if (!Number.isNaN(passed) && !Number.isNaN(total)) {
      return { passed, total }
    }
  }

  return { passed: null, total: null }
}
