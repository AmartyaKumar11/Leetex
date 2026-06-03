import {
  calculateResultConfidence,
  createEmptyResultData,
  mergeResultData,
  RESULT_STATUSES,
  type ResultData,
  type ResultSourcePanel,
  type ResultStatus
} from "~/types/results"
import { observerDebugLog } from "~/utils/observer-debug"

export type ExtractionSource = "run" | "submit"

const RUN_PANEL_SELECTORS = [
  '[data-e2e-locator="console-result"]',
  '[data-e2e-locator="testcase-result"]',
  '[class*="console-result"]',
  '[class*="ConsoleResult"]',
  '[class*="testcase-result"]'
] as const

const SUBMIT_PANEL_SELECTORS = [
  '[data-e2e-locator="submission-result"]',
  '[class*="submit-result"]',
  '[class*="SubmitResult"]',
  '[class*="submission-result"]'
] as const

const SHARED_PANEL_SELECTORS = [
  '[class*="JudgeResult"]',
  '[class*="judge-result"]',
  '[class*="ResultPanel"]',
  '[class*="result-panel"]'
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

export function extractResultDataFromDom(
  expectedSource: ExtractionSource
): ResultData | null {
  const primaryContainers = findContainersForSource(expectedSource)
  const alternateSource: ExtractionSource = expectedSource === "run" ? "submit" : "run"
  const alternateContainers = findContainersForSource(alternateSource)

  let merged = createEmptyResultData("Unknown")
  let detectedPanel: ResultSourcePanel = "unknown"

  if (primaryContainers.length > 0) {
    merged = mergeFromContainers(primaryContainers)
    detectedPanel = expectedSource
  }

  if (merged.status === "Unknown" && alternateContainers.length > 0) {
    const alternate = mergeFromContainers(alternateContainers)
    merged = mergeResultData(merged, alternate)
    detectedPanel = "unknown"

    observerDebugLog("Result Source Mismatch", {
      expectedSource,
      usedAlternate: alternateSource,
      detectedPanel
    })
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    const shared = findSharedContainers()

    if (shared.length > 0) {
      merged = mergeFromContainers(shared)
      detectedPanel = inferPanelFromContainers(shared, expectedSource)
    }
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    return null
  }

  const validatedPanel = validateSourcePanel(detectedPanel, expectedSource)
  merged.sourcePanel = validatedPanel
  merged.confidence = calculateResultConfidence(merged)

  observerDebugLog("Result Extraction", {
    expectedSource,
    sourcePanel: validatedPanel,
    confidence: merged.confidence,
    status: merged.status,
    passed: merged.passed,
    total: merged.total
  })

  return merged
}

export function findResultContainers(): Element[] {
  return [
    ...findContainersForSource("run"),
    ...findContainersForSource("submit"),
    ...findSharedContainers()
  ]
}

export { RESULT_CONTAINER_SELECTORS } from "~/utils/leetcode-result-selectors"

function findContainersForSource(source: ExtractionSource): Element[] {
  const selectors = source === "run" ? RUN_PANEL_SELECTORS : SUBMIT_PANEL_SELECTORS
  return queryContainers(selectors)
}

function findSharedContainers(): Element[] {
  return queryContainers(SHARED_PANEL_SELECTORS)
}

function queryContainers(selectors: readonly string[]): Element[] {
  const seen = new Set<Element>()
  const containers: Element[] = []

  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (!seen.has(element) && hasResultSignals(element)) {
        seen.add(element)
        containers.push(element)
      }
    }
  }

  return containers
}

function mergeFromContainers(containers: Element[]): ResultData {
  let merged = createEmptyResultData("Unknown")

  for (const container of containers) {
    const text = container.textContent ?? ""

    if (!text.trim()) {
      continue
    }

    merged = mergeResultData(merged, extractFromContainer(container, text))
  }

  return merged
}

function validateSourcePanel(
  detected: ResultSourcePanel,
  expected: ExtractionSource
): ResultSourcePanel {
  if (detected === "unknown") {
    return "unknown"
  }

  return detected === expected ? expected : "unknown"
}

function inferPanelFromContainers(
  containers: Element[],
  expected: ExtractionSource
): ResultSourcePanel {
  for (const container of containers) {
    const panel = detectPanelType(container)

    if (panel !== "unknown") {
      return panel
    }
  }

  return expected
}

function detectPanelType(element: Element): ResultSourcePanel {
  if (element.closest(RUN_PANEL_SELECTORS.join(",")) || matchesAny(element, RUN_PANEL_SELECTORS)) {
    return "run"
  }

  if (
    element.closest(SUBMIT_PANEL_SELECTORS.join(",")) ||
    matchesAny(element, SUBMIT_PANEL_SELECTORS)
  ) {
    return "submit"
  }

  const locator = element.getAttribute("data-e2e-locator") ?? ""

  if (locator.includes("console") || locator.includes("testcase")) {
    return "run"
  }

  if (locator.includes("submission")) {
    return "submit"
  }

  return "unknown"
}

function matchesAny(element: Element, selectors: readonly string[]): boolean {
  return selectors.some((selector) => element.matches(selector))
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

  Object.assign(partial, extractFailedCaseDetailsStrategyC(container))

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

function extractPassedTotalStrategyA(text: string): { passed: number; total: number } | null {
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

function extractCaseCountStrategyB(container: Element): { passed: number; total: number } | null {
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

  for (const candidate of container.querySelectorAll(
    'button, [role="tab"], [role="row"], li, div, span'
  )) {
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

function extractFailedCaseDetailsStrategyC(container: Element): Partial<ResultData> {
  const partial: Partial<ResultData> = {}

  const failedInput = findLabelValue(container, ["Input", "input"])
  const actualOutput = findLabelValue(container, [
    "Output",
    "Stdout",
    "Your Output",
    "Actual Output"
  ])
  const expectedOutput = findLabelValue(container, ["Expected", "Expected Output"])

  if (failedInput) partial.failedInput = failedInput
  if (actualOutput) partial.actualOutput = actualOutput
  if (expectedOutput) partial.expectedOutput = expectedOutput

  return partial
}

function findLabelValue(root: Element, labels: string[]): string | null {
  for (const label of labels) {
    const value = findLabelValueForText(root, label)
    if (value) return value
  }
  return null
}

function findLabelValueForText(root: Element, label: string): string | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node = walker.currentNode as Element | null

  while (node) {
    const directText = getDirectText(node).trim()

    if (directText.toLowerCase() === label.toLowerCase()) {
      return readValueFromSibling(node) ?? readValueFromParent(node)
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
  if (!parent) return null

  const siblings = Array.from(parent.children)
  const index = siblings.indexOf(labelElement)

  for (let i = index + 1; i < siblings.length; i += 1) {
    const text = siblings[i].textContent?.trim()
    if (text && !isLabelText(text)) return normalizeValue(text)
  }

  return null
}

function readValueFromParent(labelElement: Element): string | null {
  const parent = labelElement.parentElement?.parentElement
  if (!parent) return null

  for (const block of parent.querySelectorAll("pre, code, [class*='value'], [class*='content']")) {
    const text = block.textContent?.trim()
    if (text && text.length > 0 && text.length < 5000) return normalizeValue(text)
  }

  const fullText = parent.textContent?.replace(labelElement.textContent ?? "", "").trim()
  if (fullText && fullText.length > 0 && fullText.length < 5000) return normalizeValue(fullText)

  return null
}

function isLabelText(text: string): boolean {
  return /^(input|output|expected|stdout|runtime|memory)$/i.test(text.trim())
}

function normalizeValue(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function extractRuntimeStrategyD(text: string): string | null {
  return text.match(RUNTIME_PATTERN)?.[1]?.trim() ?? null
}

function extractMemoryStrategyE(text: string): string | null {
  return text.match(MEMORY_PATTERN)?.[1]?.trim() ?? null
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
