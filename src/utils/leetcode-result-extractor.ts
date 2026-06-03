import {
  createEmptyResultData,
  mergeResultData,
  RESULT_STATUSES,
  type ResultData,
  type ResultStatus
} from "~/types/results"

/** Primary LeetCode result panel roots — ordered by specificity. */
export const RESULT_CONTAINER_SELECTORS = [
  '[data-e2e-locator="console-result"]',
  '[data-e2e-locator="submission-result"]',
  '[data-e2e-locator="testcase-result"]',
  '[class*="JudgeResult"]',
  '[class*="judge-result"]',
  '[class*="testcase-result"]',
  '[class*="TestcaseResult"]',
  '[class*="ResultPanel"]',
  '[class*="result-panel"]',
  '[class*="submit-result"]',
  '[class*="SubmitResult"]',
  '[class*="console-result"]',
  '[role="tabpanel"]'
] as const

const STATUS_PATTERNS: { status: ResultStatus; pattern: RegExp }[] = [
  { status: "Accepted", pattern: /\baccepted\b/i },
  { status: "Wrong Answer", pattern: /\bwrong answer\b/i },
  { status: "Runtime Error", pattern: /\bruntime error\b/i },
  { status: "Time Limit Exceeded", pattern: /\btime limit exceeded\b/i },
  { status: "Memory Limit Exceeded", pattern: /\bmemory limit exceeded\b/i },
  { status: "Compilation Error", pattern: /\bcompilation error\b/i }
]

const PASSED_TOTAL_PATTERNS = [
  /passed\s+(\d+)\s*\/\s*(\d+)\s*test\s*cases?/i,
  /passed\s*:?\s*(\d+)\s*\/\s*(\d+)/i,
  /(\d+)\s*\/\s*(\d+)\s*test\s*cases?\s*passed/i,
  /(\d+)\s+of\s+(\d+)\s+test\s*cases?\s*passed/i,
  /(\d+)\s*\/\s*(\d+)\s*testcases?/i
] as const

const RUNTIME_PATTERN = /runtime\s*:?\s*(\d+\s*ms)/i
const MEMORY_PATTERN = /memory\s*:?\s*([\d.]+\s*(?:MB|KB|GB|bytes?))/i

const PASS_MARKERS = /[✓✔√]|pass(ed)?/i
const FAIL_MARKERS = /[✗✘×]|fail(ed)?|wrong/i

export function findResultContainers(): Element[] {
  const seen = new Set<Element>()
  const containers: Element[] = []

  for (const selector of RESULT_CONTAINER_SELECTORS) {
    for (const element of document.querySelectorAll(selector)) {
      if (!seen.has(element) && hasResultSignals(element)) {
        seen.add(element)
        containers.push(element)
      }
    }
  }

  const consolePanel =
    document.querySelector('[data-e2e-locator="console-panel"]') ??
    document.querySelector('[class*="ConsolePanel"]') ??
    document.querySelector('[class*="console-panel"]')

  if (consolePanel && !seen.has(consolePanel)) {
    containers.push(consolePanel)
  }

  return containers.length > 0 ? containers : [document.body]
}

export function extractResultDataFromDom(): ResultData | null {
  const containers = findResultContainers()
  let merged = createEmptyResultData("Unknown")

  for (const container of containers) {
    const text = container.textContent ?? ""

    if (!text.trim()) {
      continue
    }

    merged = mergeResultData(merged, extractFromContainer(container, text))
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    return null
  }

  return merged
}

function extractFromContainer(container: Element, text: string): Partial<ResultData> {
  const partial: Partial<ResultData> = {}

  const status = parseStatus(text)
  if (status) partial.status = status

  const passedTotal = extractPassedTotalStrategyA(text) ?? extractCaseCountStrategyB(container)
  if (passedTotal) {
    partial.passed = passedTotal.passed
    partial.total = passedTotal.total
  }

  const failedDetails = extractFailedCaseDetailsStrategyC(container)
  Object.assign(partial, failedDetails)

  const runtime = extractRuntimeStrategyD(text)
  if (runtime) partial.runtime = runtime

  const memory = extractMemoryStrategyE(text)
  if (memory) partial.memory = memory

  return partial
}

function parseStatus(text: string): ResultStatus | null {
  for (const { status, pattern } of STATUS_PATTERNS) {
    if (pattern.test(text)) {
      return status
    }
  }

  for (const known of RESULT_STATUSES) {
    if (known !== "Unknown" && text.toLowerCase().includes(known.toLowerCase())) {
      return known
    }
  }

  return null
}

/** Strategy A — "Passed 153 / 1153 testcases" */
function extractPassedTotalStrategyA(text: string): {
  passed: number
  total: number
} | null {
  for (const pattern of PASSED_TOTAL_PATTERNS) {
    const match = text.match(pattern)

    if (match) {
      const passed = Number(match[1])
      const total = Number(match[2])

      if (!Number.isNaN(passed) && !Number.isNaN(total) && total > 0) {
        return { passed, total }
      }
    }
  }

  const genericSlash = text.match(/(\d+)\s*\/\s*(\d+)/)

  if (genericSlash) {
    const passed = Number(genericSlash[1])
    const total = Number(genericSlash[2])

    if (!Number.isNaN(passed) && !Number.isNaN(total) && total >= passed && total > 0) {
      return { passed, total }
    }
  }

  return null
}

/** Strategy B — count Case rows with pass/fail markers */
function extractCaseCountStrategyB(container: Element): {
  passed: number
  total: number
} | null {
  const caseRows = findCaseRows(container)

  if (caseRows.length === 0) {
    return null
  }

  let passed = 0

  for (const row of caseRows) {
    const rowText = row.textContent ?? ""

    if (FAIL_MARKERS.test(rowText)) {
      continue
    }

    if (PASS_MARKERS.test(rowText)) {
      passed += 1
    }
  }

  return { passed, total: caseRows.length }
}

function findCaseRows(container: Element): Element[] {
  const rows: Element[] = []
  const seen = new Set<Element>()

  const candidates = container.querySelectorAll(
    'button, [role="tab"], [role="row"], li, div, span'
  )

  for (const candidate of candidates) {
    const label = candidate.textContent?.trim() ?? ""

    if (!/^case\s+\d+/i.test(label)) {
      continue
    }

    const row = candidate.closest('[role="row"], li, div[class*="case"], button') ?? candidate

    if (!seen.has(row)) {
      seen.add(row)
      rows.push(row)
    }
  }

  return rows
}

/** Strategy C — Input / Output / Expected from failed case panel */
function extractFailedCaseDetailsStrategyC(container: Element): Partial<ResultData> {
  const failedInput = findLabelValue(container, ["Input", "input"])
  const actualOutput = findLabelValue(container, [
    "Output",
    "Stdout",
    "Your Output",
    "Actual Output"
  ])
  const expectedOutput = findLabelValue(container, ["Expected", "Expected Output"])

  const partial: Partial<ResultData> = {}

  if (failedInput) partial.failedInput = failedInput
  if (actualOutput) partial.actualOutput = actualOutput
  if (expectedOutput) partial.expectedOutput = expectedOutput

  return partial
}

function findLabelValue(root: Element, labels: string[]): string | null {
  for (const label of labels) {
    const value = findLabelValueForText(root, label)

    if (value) {
      return value
    }
  }

  return null
}

function findLabelValueForText(root: Element, label: string): string | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)

  let node = walker.currentNode as Element | null

  while (node) {
    const directText = getDirectText(node).trim()

    if (directText.toLowerCase() === label.toLowerCase()) {
      const fromSibling = readValueFromSibling(node)

      if (fromSibling) {
        return fromSibling
      }

      const fromParent = readValueFromParent(node)

      if (fromParent) {
        return fromParent
      }
    }

    node = walker.nextNode() as Element | null
  }

  return null
}

function getDirectText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
}

function readValueFromSibling(labelElement: Element): string | null {
  const parent = labelElement.parentElement

  if (!parent) {
    return null
  }

  const siblings = Array.from(parent.children)
  const index = siblings.indexOf(labelElement)

  for (let i = index + 1; i < siblings.length; i += 1) {
    const text = siblings[i].textContent?.trim()

    if (text && !isLabelText(text)) {
      return normalizeValue(text)
    }
  }

  return null
}

function readValueFromParent(labelElement: Element): string | null {
  const parent = labelElement.parentElement?.parentElement

  if (!parent) {
    return null
  }

  const blocks = parent.querySelectorAll("pre, code, [class*='value'], [class*='content']")

  for (const block of blocks) {
    const text = block.textContent?.trim()

    if (text && text.length > 0 && text.length < 5000) {
      return normalizeValue(text)
    }
  }

  const fullText = parent.textContent?.replace(labelElement.textContent ?? "", "").trim()

  if (fullText && fullText.length > 0 && fullText.length < 5000) {
    return normalizeValue(fullText)
  }

  return null
}

function isLabelText(text: string): boolean {
  return /^(input|output|expected|stdout|runtime|memory)$/i.test(text.trim())
}

function normalizeValue(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** Strategy D — Runtime */
function extractRuntimeStrategyD(text: string): string | null {
  const match = text.match(RUNTIME_PATTERN)
  return match?.[1]?.trim() ?? null
}

/** Strategy E — Memory */
function extractMemoryStrategyE(text: string): string | null {
  const match = text.match(MEMORY_PATTERN)
  return match?.[1]?.trim() ?? null
}

function hasResultSignals(element: Element): boolean {
  const text = element.textContent ?? ""

  return (
    parseStatus(text) !== null ||
    PASSED_TOTAL_PATTERNS.some((pattern) => pattern.test(text)) ||
    /case\s+\d+/i.test(text) ||
    /runtime\s*:?\s*\d+\s*ms/i.test(text)
  )
}

function hasAnyExtractedField(result: ResultData): boolean {
  return (
    result.passed != null ||
    result.total != null ||
    result.runtime != null ||
    result.memory != null ||
    result.failedInput != null ||
    result.actualOutput != null ||
    result.expectedOutput != null
  )
}
