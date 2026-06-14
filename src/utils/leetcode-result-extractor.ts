import {
  calculateResultConfidence,
  createEmptyResultData,
  isErrorResultStatus,
  mergeResultData,
  RESULT_STATUSES,
  type ResultData,
  type ResultSourcePanel,
  type ResultStatus
} from "~/types/results"
import { isResultDebugEnabled, resultDebugField, resultDebugLog } from "~/utils/result-extraction-debug"
import {
  logDiagnosticRule,
  logStatusDetected,
  scanDiagnosticCandidates
} from "~/utils/result-extraction-diagnostics"

export type ExtractionSource = "run" | "submit"

const FLEXLAYOUT_TAB_SELECTOR = ".flexlayout__tab"

const CONSOLE_RESULT_LOCATOR = '[data-e2e-locator="console-result"]'
const SUBMISSION_RESULT_LOCATOR = '[data-e2e-locator="submission-result"]'
const TESTCASE_RESULT_LOCATOR = '[data-e2e-locator="testcase-result"]'

const ERROR_TEXT_SELECTORS = [
  "div.whitespace-pre-wrap.break-all",
  "div.whitespace-pre-wrap",
  "pre",
  "code"
] as const

const RUN_PANEL_SELECTORS = [
  CONSOLE_RESULT_LOCATOR,
  TESTCASE_RESULT_LOCATOR,
  '[data-e2e-locator*="console"]'
] as const

const SUBMIT_PANEL_SELECTORS = [
  SUBMISSION_RESULT_LOCATOR,
  '[data-e2e-locator*="submission"]'
] as const

const STATUS_ANCHORS = [
  "Accepted",
  "Wrong Answer",
  "Runtime Error",
  "Compile Error",
  "Compilation Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded"
] as const

const STATUS_PATTERNS: { status: ResultStatus; pattern: RegExp }[] = [
  { status: "Accepted", pattern: /\baccepted\b/i },
  { status: "Wrong Answer", pattern: /\bwrong answer\b/i },
  { status: "Runtime Error", pattern: /\bruntime error\b/i },
  { status: "Time Limit Exceeded", pattern: /\btime limit exceeded\b/i },
  { status: "Memory Limit Exceeded", pattern: /\bmemory limit exceeded\b/i },
  { status: "Compilation Error", pattern: /\b(compilation|compile) error\b/i }
]

const ERROR_CATEGORY_PATTERNS: { category: string; pattern: RegExp }[] = [
  { category: "SyntaxError", pattern: /\bSyntaxError\b/i },
  { category: "TypeError", pattern: /\bTypeError\b/i },
  { category: "NameError", pattern: /\bNameError\b/i },
  { category: "IndexError", pattern: /\bIndexError\b/i },
  { category: "ValueError", pattern: /\bValueError\b/i },
  { category: "KeyError", pattern: /\bKeyError\b/i },
  { category: "AttributeError", pattern: /\bAttributeError\b/i },
  { category: "ZeroDivisionError", pattern: /\bZeroDivisionError\b/i },
  { category: "NullPointerException", pattern: /\bNullPointerException\b/i },
  { category: "StackOverflowError", pattern: /\bStackOverflowError\b/i },
  { category: "SegmentationFault", pattern: /segmentation fault/i },
  { category: "HeapBufferOverflow", pattern: /heap-buffer-overflow/i }
]

const PASSED_TOTAL_PATTERNS = [
  /(\d+)\s*\/\s*(\d+)\s*test\s*cases?\s*passed/i,
  /passed\s+(\d+)\s*\/\s*(\d+)\s*test\s*cases?/i,
  /passed\s*:?\s*(\d+)\s*\/\s*(\d+)/i,
  /(\d+)\s+of\s+(\d+)\s+test\s*cases?\s*passed/i,
  /(\d+)\s*\/\s*(\d+)\s*testcases?\s*passed/i,
  /(\d+)\s*\/\s*(\d+)\s*testcases?/i
] as const

const RUNTIME_PATTERNS = [
  /runtime\s*:?\s*(\d+\s*ms)/i,
  /\b(\d+\s*ms)\s*runtime\b/i,
  /\b(\d+\s*ms)\b/
] as const

const MEMORY_PATTERNS = [
  /memory\s*:?\s*([\d.]+\s*(?:MB|KB|GB|bytes?))/i,
  /\b([\d.]+\s*(?:MB|KB|GB))\s*memory\b/i,
  /\b([\d.]+\s*MB)\b/
] as const

const PASS_MARKERS = /[✓✔√]|pass(ed)?/i
const FAIL_MARKERS = /[✗✘×]|fail(ed)?|wrong/i

const INPUT_LABELS = ["input", "stdin", "your input", "testcase input", "last executed input"]
const OUTPUT_LABELS = ["output", "stdout", "your output", "actual output", "actual"]
const EXPECTED_LABELS = ["expected", "expected output", "expected answer"]
const RUNTIME_LABELS = ["runtime", "execution time"]
const MEMORY_LABELS = ["memory", "memory usage"]

const ERROR_DISCOVERY_MARKERS = [
  "syntaxerror",
  "traceback",
  "exception",
  "error:",
  "line ",
  "segmentation fault",
  "heap-buffer-overflow",
  "null pointer",
  "stack overflow",
  "expected ",
  "undeclared",
  "was not declared",
  "invalid syntax"
]

const MAX_ERROR_BLOCK_LENGTH = 2000

const PAGE_CHROME_MARKERS = [
  "Problem List",
  "Description",
  "Editorial",
  "Solutions",
  "Submissions",
  "Notebook",
  "Premium",
  "Streak"
] as const

const RUNTIME_ERROR_SIGNAL_PATTERN =
  /\b(SyntaxError|TypeError|IndexError|KeyError|NameError|RuntimeError|Exception)\b|Traceback|line\s+\d+/i

const COMPILATION_ERROR_SIGNAL_PATTERN =
  /error:|expected|undeclared|missing|syntax error|compilation failed|line\s+\d+/i

export function extractResultDataFromDom(
  expectedSource: ExtractionSource
): ResultData | null {
  const panels = findScopedResultPanels(expectedSource)

  if (panels.length === 0) {
    if (isResultDebugEnabled()) {
      console.info("[LeetEx Result Panel]", {
        panelFound: false,
        panelLength: 0,
        status: null,
        errorPreview: null
      })
    }
    return null
  }

  let merged = createEmptyResultData("Unknown")
  let detectedPanel: ResultSourcePanel = "unknown"

  for (const { panel, source } of panels) {
    scanDiagnosticCandidates(panel)

    const extracted = extractFromResultPanel(panel, source)

    merged = mergeResultData(merged, extracted)

    if (source === expectedSource) {
      detectedPanel = source
    } else if (detectedPanel === "unknown") {
      detectedPanel = source
    }
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    return null
  }

  const validatedPanel = validateSourcePanel(detectedPanel, expectedSource)
  merged.sourcePanel = validatedPanel
  merged.confidence = calculateResultConfidence(merged)

  logExtractionSummary(merged, expectedSource, validatedPanel)

  return merged
}

export function findResultContainers(): Element[] {
  const seen = new Set<Element>()
  const containers: Element[] = []

  for (const source of ["run", "submit"] as const) {
    for (const { panel } of findScopedResultPanels(source)) {
      if (!seen.has(panel)) {
        seen.add(panel)
        containers.push(panel)
      }
    }
  }

  return containers
}

export { RESULT_CONTAINER_SELECTORS } from "~/utils/leetcode-result-selectors"

interface ScopedResultPanel {
  panel: Element
  source: ResultSourcePanel
}

function findScopedResultPanels(expectedSource: ExtractionSource): ScopedResultPanel[] {
  const panels: ScopedResultPanel[] = []
  const seen = new Set<Element>()

  const addPanel = (panel: Element, source: ResultSourcePanel) => {
    if (seen.has(panel) || source === "unknown") {
      return
    }

    seen.add(panel)
    panels.push({ panel, source })
  }

  for (const tab of document.querySelectorAll(FLEXLAYOUT_TAB_SELECTOR)) {
    if (tab.querySelector(CONSOLE_RESULT_LOCATOR) || tab.querySelector(TESTCASE_RESULT_LOCATOR)) {
      addPanel(tab, "run")
      continue
    }

    if (tab.querySelector(SUBMISSION_RESULT_LOCATOR)) {
      addPanel(tab, "submit")
    }
  }

  if (panels.length === 0) {
    addPanelFromLocator(CONSOLE_RESULT_LOCATOR, "run", seen, panels)
    addPanelFromLocator(TESTCASE_RESULT_LOCATOR, "run", seen, panels)
    addPanelFromLocator(SUBMISSION_RESULT_LOCATOR, "submit", seen, panels)
  }

  panels.sort((a, b) => {
    if (a.source === expectedSource && b.source !== expectedSource) {
      return -1
    }

    if (b.source === expectedSource && a.source !== expectedSource) {
      return 1
    }

    const aHasConsole = Boolean(a.panel.querySelector(CONSOLE_RESULT_LOCATOR))
    const bHasConsole = Boolean(b.panel.querySelector(CONSOLE_RESULT_LOCATOR))

    if (aHasConsole && !bHasConsole) {
      return -1
    }

    if (bHasConsole && !aHasConsole) {
      return 1
    }

    return 0
  })

  return panels
}

function addPanelFromLocator(
  locator: string,
  source: ResultSourcePanel,
  seen: Set<Element>,
  panels: ScopedResultPanel[]
): void {
  const anchor = document.querySelector(locator)

  if (!anchor) {
    return
  }

  const tab = anchor.closest(FLEXLAYOUT_TAB_SELECTOR)

  if (!tab || seen.has(tab)) {
    return
  }

  seen.add(tab)
  panels.push({ panel: tab, source })
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

function detectPanelType(element: Element): ResultSourcePanel {
  if (element.querySelector(CONSOLE_RESULT_LOCATOR) || element.querySelector(TESTCASE_RESULT_LOCATOR)) {
    return "run"
  }

  if (element.querySelector(SUBMISSION_RESULT_LOCATOR)) {
    return "submit"
  }

  if (element.closest(RUN_PANEL_SELECTORS.join(",")) || matchesAny(element, RUN_PANEL_SELECTORS)) {
    return "run"
  }

  if (
    element.closest(SUBMIT_PANEL_SELECTORS.join(",")) ||
    matchesAny(element, SUBMIT_PANEL_SELECTORS)
  ) {
    return "submit"
  }

  return "unknown"
}

function matchesAny(element: Element, selectors: readonly string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector)
    } catch {
      return false
    }
  })
}

function extractFromResultPanel(
  panel: Element,
  source: ResultSourcePanel
): Partial<ResultData> {
  const partial: Partial<ResultData> = {}
  const panelText = panel.textContent ?? ""

  const status = extractStatusFromPanel(panel, source)
  if (status) {
    partial.status = status
    logStatusDetected(status, panel)
    resultDebugField("Status Found", status)
  }

  const passedTotal =
    extractPassedTotalFromText(panelText) ?? extractCaseCountFromRows(panel)

  if (passedTotal) {
    partial.passed = passedTotal.passed
    partial.total = passedTotal.total
    resultDebugField("Passed Cases Found", passedTotal)
  }

  const lastExecutedInput = extractLastExecutedInput(panel)
  const failedDetails = extractFailedCaseDetails(panel)

  if (lastExecutedInput) {
    partial.failedInput = lastExecutedInput
    logDiagnosticRule("wrong_answer.failed_input", true, {
      preview: lastExecutedInput.slice(0, 80),
      source: "last_executed_input"
    })
    resultDebugField("Failed Input Found", lastExecutedInput.slice(0, 120))
  } else if (failedDetails.failedInput) {
    partial.failedInput = failedDetails.failedInput
  }

  if (failedDetails.actualOutput) {
    partial.actualOutput = failedDetails.actualOutput
  }

  if (failedDetails.expectedOutput) {
    partial.expectedOutput = failedDetails.expectedOutput
  }

  if (!lastExecutedInput && !failedDetails.failedInput) {
    logDiagnosticRule("wrong_answer.failed_input", false, { note: "no label match in panel" })
  }

  const stats = extractRuntimeAndMemory(panel, panelText, status)
  if (stats.runtime) {
    partial.runtime = stats.runtime
    logDiagnosticRule("accepted.runtime", true, { runtime: stats.runtime })
    resultDebugField("Runtime Found", stats.runtime)
  } else {
    logDiagnosticRule("accepted.runtime", false, { note: "label/chip/text scan missed runtime" })
  }
  if (stats.memory) {
    partial.memory = stats.memory
    logDiagnosticRule("accepted.memory", true, { memory: stats.memory })
    resultDebugField("Memory Found", stats.memory)
  } else {
    logDiagnosticRule("accepted.memory", false, { note: "label/chip/text scan missed memory" })
  }

  const resolvedStatus = status

  if (resolvedStatus && isErrorResultStatus(resolvedStatus)) {
    const errorDetails = extractErrorDetailsFromPanel(panel, resolvedStatus)

    if (errorDetails.errorText) {
      partial.errorText = errorDetails.errorText
      partial.errorCategory = errorDetails.errorCategory
      logDiagnosticRule("error.error_text", true, {
        category: errorDetails.errorCategory,
        preview: errorDetails.errorText.slice(0, 120)
      })
      logDiagnosticRule("error.error_block_scoring", true, {
        category: errorDetails.errorCategory
      })
      resultDebugField("Error Block Found", {
        category: errorDetails.errorCategory,
        text: errorDetails.errorText.slice(0, 200)
      })
    } else {
      logDiagnosticRule("error.error_text", false, { note: "no informative error block in panel" })
      logDiagnosticRule("error.error_block_scoring", false, { status: resolvedStatus })
      logDiagnosticRule("error.error_section_traversal", false, {
        note: "panel-scoped error scan found nothing"
      })
    }
  }

  if (isResultDebugEnabled()) {
    console.info("[LeetEx Result Panel]", {
      panelFound: true,
      panelLength: panelText.length,
      status: partial.status ?? null,
      errorPreview: partial.errorText?.slice(0, 150) ?? null
    })
  }

  return partial
}

function extractStatusFromPanel(
  panel: Element,
  source: ResultSourcePanel
): ResultStatus | null {
  const primaryLocator =
    source === "run"
      ? `${CONSOLE_RESULT_LOCATOR}, ${TESTCASE_RESULT_LOCATOR}`
      : SUBMISSION_RESULT_LOCATOR

  let statusEl = panel.querySelector(primaryLocator)

  if (!statusEl) {
    statusEl =
      panel.querySelector(CONSOLE_RESULT_LOCATOR) ??
      panel.querySelector(SUBMISSION_RESULT_LOCATOR) ??
      panel.querySelector(TESTCASE_RESULT_LOCATOR)
  }

  if (statusEl) {
    const fromLocator = parseStatusFromLocatorElement(statusEl)

    if (fromLocator) {
      return fromLocator
    }
  }

  return parseStatus(panel.textContent ?? "")
}

function parseStatusFromLocatorElement(element: Element): ResultStatus | null {
  const label = (getDirectText(element).trim() || element.textContent?.trim() || "")

  if (!label) {
    return null
  }

  for (const anchor of STATUS_ANCHORS) {
    if (label.toLowerCase() === anchor.toLowerCase()) {
      return anchor === "Compile Error" ? "Compilation Error" : (anchor as ResultStatus)
    }
  }

  return parseStatus(label)
}

function extractLastExecutedInput(panel: Element): string | null {
  for (const element of panel.querySelectorAll("*")) {
    const direct = getDirectText(element).trim()

    if (direct.toLowerCase() !== "last executed input") {
      continue
    }

    const block = readInputBlockAfterLabel(element)

    if (block) {
      return block
    }
  }

  return extractLabelValue(panel, ["last executed input"])
}

function readInputBlockAfterLabel(labelElement: Element): string | null {
  const lines: string[] = []
  const parent = labelElement.parentElement

  if (parent) {
    let pastLabel = false

    for (const child of parent.children) {
      if (child === labelElement || child.contains(labelElement)) {
        pastLabel = true
        continue
      }

      if (!pastLabel) {
        continue
      }

      const text =
        extractCodeLikeText(child) ?? normalizeMultiline(child.textContent ?? "").trim()

      if (!text || isSectionHeader(text)) {
        continue
      }

      lines.push(text)
    }
  }

  if (lines.length > 0) {
    return lines.join("\n")
  }

  return readValueFromFollowingElements(labelElement)
}

function isSectionHeader(text: string): boolean {
  const normalized = text.trim().toLowerCase()

  return (
    isLabelText(text) ||
    /^(last executed input|stdout|stderr|runtime error|compile error|compilation error|wrong answer|accepted)$/i.test(
      normalized
    )
  )
}

function extractErrorDetailsFromPanel(
  panel: Element,
  status: ResultStatus
): { errorText: string | null; errorCategory: string | null } {
  if (isResultDebugEnabled()) {
    console.info("[LeetEx Error Root]", (panel.textContent ?? "").slice(0, 1000))
  }

  for (const selector of ERROR_TEXT_SELECTORS) {
    for (const element of panel.querySelectorAll(selector)) {
      const text = normalizeMultiline(element.textContent ?? "")

      if (!text || text.length < 4 || isStatusOnlyText(text)) {
        continue
      }

      if (scoreErrorBlock(text, status) > 0) {
        return {
          errorText: text,
          errorCategory: parseErrorCategory(text, status)
        }
      }
    }
  }

  const bestBlock = findBestErrorBlock(panel, status)

  if (bestBlock) {
    return bestBlock
  }

  const fromPlain = extractErrorFromPlainText(panel.textContent ?? "", status)

  if (fromPlain) {
    return {
      errorText: fromPlain,
      errorCategory: parseErrorCategory(fromPlain, status)
    }
  }

  return { errorText: null, errorCategory: null }
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

function extractPassedTotalFromText(text: string): { passed: number; total: number } | null {
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

function extractCaseCountFromRows(container: Element): { passed: number; total: number } | null {
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

function extractFailedCaseDetails(container: Element): Partial<ResultData> {
  const partial: Partial<ResultData> = {}
  const failedSection = findFailedCaseSection(container) ?? container

  const failedInput =
    extractLabelValue(failedSection, INPUT_LABELS) ??
    extractLabelValue(container, INPUT_LABELS)

  const actualOutput =
    extractLabelValue(failedSection, OUTPUT_LABELS) ??
    extractLabelValue(container, OUTPUT_LABELS)

  const expectedOutput =
    extractLabelValue(failedSection, EXPECTED_LABELS) ??
    extractLabelValue(container, EXPECTED_LABELS)

  if (failedInput) {
    partial.failedInput = failedInput
    logDiagnosticRule("wrong_answer.failed_input", true, { preview: failedInput.slice(0, 80) })
    resultDebugField("Failed Input Found", failedInput.slice(0, 120))
  } else {
    logDiagnosticRule("wrong_answer.failed_input", false, { note: "no label match in panel" })
  }

  if (actualOutput) {
    partial.actualOutput = actualOutput
    logDiagnosticRule("wrong_answer.actual_output", true, { preview: actualOutput.slice(0, 80) })
    resultDebugField("Actual Output Found", actualOutput.slice(0, 120))
  } else {
    logDiagnosticRule("wrong_answer.actual_output", false, { note: "no label match in panel" })
  }

  if (expectedOutput) {
    partial.expectedOutput = expectedOutput
    logDiagnosticRule("wrong_answer.expected_output", true, {
      preview: expectedOutput.slice(0, 80)
    })
    resultDebugField("Expected Output Found", expectedOutput.slice(0, 120))
  } else {
    logDiagnosticRule("wrong_answer.expected_output", false, { note: "no label match in panel" })
  }

  return partial
}

function findFailedCaseSection(container: Element): Element | null {
  for (const row of findCaseRows(container)) {
    const rowText = row.textContent ?? ""

    if (FAIL_MARKERS.test(rowText) || /wrong answer/i.test(rowText)) {
      const section =
        row.closest('[class*="detail"], [class*="Detail"], section, [role="tabpanel"]') ??
        row.parentElement

      if (section) {
        return section
      }
    }
  }

  for (const element of container.querySelectorAll("*")) {
    const text = element.textContent?.trim() ?? ""

    if (/wrong answer/i.test(text) && text.length < 40) {
      return element.closest("section, div") ?? element
    }
  }

  return null
}

function extractRuntimeAndMemory(
  container: Element,
  text: string,
  status: ResultStatus | null
): { runtime: string | null; memory: string | null } {
  let runtime =
    extractMetricFromLabels(container, RUNTIME_LABELS) ??
    extractMetricFromText(text, RUNTIME_PATTERNS.slice(0, 2))

  let memory =
    extractMetricFromLabels(container, MEMORY_LABELS) ??
    extractMetricFromText(text, MEMORY_PATTERNS.slice(0, 2))

  if (!runtime || !memory) {
    const chipStats = extractStatsFromValueChips(container)

    runtime = runtime ?? chipStats.runtime
    memory = memory ?? chipStats.memory
  }

  if (status === "Accepted" && (!runtime || !memory)) {
    const loose = extractLooseStats(container)
    runtime = runtime ?? loose.runtime
    memory = memory ?? loose.memory
  }

  return { runtime, memory }
}

function extractStatsFromValueChips(container: Element): {
  runtime: string | null
  memory: string | null
} {
  let runtime: string | null = null
  let memory: string | null = null

  for (const element of container.querySelectorAll("*")) {
    const direct = getDirectText(element).trim()

    if (/^runtime$/i.test(direct)) {
      runtime = runtime ?? readMetricNearLabel(element, /\d+\s*ms/i)
    }

    if (/^memory$/i.test(direct)) {
      memory = memory ?? readMetricNearLabel(element, /[\d.]+\s*(?:MB|KB|GB)/i)
    }
  }

  return { runtime, memory }
}

function extractLooseStats(container: Element): {
  runtime: string | null
  memory: string | null
} {
  let runtime: string | null = null
  let memory: string | null = null

  for (const element of container.querySelectorAll("span, div, p, td")) {
    const text = getDirectText(element).trim()

    if (!runtime && /^\d+\s*ms$/i.test(text)) {
      runtime = text
    }

    if (!memory && /^[\d.]+\s*MB$/i.test(text)) {
      memory = text
    }
  }

  return { runtime, memory }
}

function readMetricNearLabel(labelElement: Element, pattern: RegExp): string | null {
  const fromSibling = readValueFromSibling(labelElement)
  if (fromSibling && pattern.test(fromSibling)) {
    return fromSibling.match(pattern)?.[0] ?? fromSibling
  }

  const parent = labelElement.parentElement

  if (parent) {
    for (const child of parent.children) {
      if (child === labelElement) {
        continue
      }

      const text = child.textContent?.trim() ?? ""

      if (pattern.test(text)) {
        return text.match(pattern)?.[0] ?? text
      }
    }
  }

  return null
}

function extractLabelValue(root: Element, labels: string[]): string | null {
  for (const label of labels) {
    const value = findValueForLabel(root, label)

    if (value) {
      return value
    }
  }

  return null
}

function findValueForLabel(root: Element, label: string): string | null {
  const normalizedLabel = label.toLowerCase()

  for (const element of root.querySelectorAll("*")) {
    const directText = getDirectText(element).trim().toLowerCase()

    if (directText !== normalizedLabel && !directText.startsWith(`${normalizedLabel}:`)) {
      continue
    }

    const fromSibling = readValueFromSibling(element)
    if (fromSibling) return fromSibling

    const fromParent = readValueFromParentBlock(element)
    if (fromParent) return fromParent

    const fromFollowing = readValueFromFollowingElements(element)
    if (fromFollowing) return fromFollowing
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
    const candidate = siblings[i]
    const fromCode = extractCodeLikeText(candidate)

    if (fromCode) {
      return fromCode
    }

    const text = candidate.textContent?.trim()

    if (text && !isLabelText(text)) {
      return normalizeValue(text)
    }
  }

  return null
}

function readValueFromParentBlock(labelElement: Element): string | null {
  let current: Element | null = labelElement.parentElement

  for (let depth = 0; depth < 6 && current; depth += 1) {
    for (const block of current.querySelectorAll("pre, code")) {
      const text = extractCodeLikeText(block)

      if (text && !isLabelText(text)) {
        return text
      }
    }

    current = current.parentElement
  }

  return null
}

function readValueFromFollowingElements(labelElement: Element): string | null {
  const root =
    labelElement.closest("section, [role='tabpanel'], div") ?? labelElement.parentElement

  if (!root) {
    return null
  }

  let seenLabel = false

  for (const element of root.querySelectorAll("pre, code, div, span, p")) {
    if (element === labelElement || element.contains(labelElement)) {
      if (
        element === labelElement ||
        getDirectText(element).trim().toLowerCase() ===
          getDirectText(labelElement).trim().toLowerCase()
      ) {
        seenLabel = true
      }
      continue
    }

    if (!seenLabel) {
      continue
    }

    const text = extractCodeLikeText(element)

    if (text && !isLabelText(text)) {
      return text
    }
  }

  return null
}

function extractCodeLikeText(element: Element): string | null {
  const text = element.textContent?.trim()

  if (!text || text.length === 0 || text.length > 8000) {
    return null
  }

  if (isLabelText(text)) {
    return null
  }

  return normalizeValue(text)
}

function extractMetricFromLabels(root: Element, labels: string[]): string | null {
  for (const label of labels) {
    const value = findValueForLabel(root, label)

    if (value) {
      return value
    }
  }

  return null
}

function extractMetricFromText(text: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

function findBestErrorBlock(
  container: Element,
  status: ResultStatus
): { errorText: string | null; errorCategory: string | null } | null {
  const candidates: { score: number; text: string }[] = []
  const debug = isResultDebugEnabled()

  if (debug) {
    const rootText = container.textContent ?? ""
    console.info("[LeetEx Error Rankings]", "Resolved panel root", {
      sourcePanel: detectPanelType(container),
      rootLength: rootText.length,
      rootPreview: errorBlockPreview(rootText)
    })
  }

  for (const element of container.querySelectorAll("pre, code, div, span, p")) {
    const text = normalizeMultiline(element.textContent ?? "")

    if (!text || text.length < 4 || isStatusOnlyText(text)) {
      continue
    }

    const score = scoreErrorBlock(text, status)

    if (score > 0) {
      candidates.push({ score, text })
    }
  }

  const lineBlock = extractMultilineErrorBlock(container.textContent ?? "", status)

  if (lineBlock) {
    const lineScore = scoreErrorBlock(lineBlock, status)

    if (lineScore > 0) {
      candidates.push({ score: lineScore + 2, text: lineBlock })
    }
  }

  if (candidates.length === 0) {
    if (debug) {
      console.info("[LeetEx Error Scan Summary]", { candidateCount: 0 })
    }
    return null
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]!

  if (debug) {
    console.info("[LeetEx Error Rankings]", "Top 10 candidates by score", {
      candidates: candidates.slice(0, 10).map((candidate) => ({
        score: candidate.score,
        length: candidate.text.length,
        preview: errorBlockPreview(candidate.text)
      }))
    })
    console.info("[LeetEx Error Rankings]", "Winning candidate", {
      score: best.score,
      length: best.text.length,
      preview: errorBlockPreview(best.text)
    })
  }

  return {
    errorText: best.text,
    errorCategory: parseErrorCategory(best.text, status)
  }
}

function errorBlockPreview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 150)
}

function containsPageChrome(text: string): boolean {
  return PAGE_CHROME_MARKERS.some((marker) => text.includes(marker))
}

function hasRuntimeErrorSignal(text: string): boolean {
  return RUNTIME_ERROR_SIGNAL_PATTERN.test(text)
}

function hasCompilationErrorSignal(text: string): boolean {
  return COMPILATION_ERROR_SIGNAL_PATTERN.test(text)
}

function scoreErrorBlock(text: string, status: ResultStatus): number {
  if (text.length > MAX_ERROR_BLOCK_LENGTH) {
    return 0
  }

  if (containsPageChrome(text)) {
    return 0
  }

  if (status === "Runtime Error" && !hasRuntimeErrorSignal(text)) {
    return 0
  }

  if (status === "Compilation Error" && !hasCompilationErrorSignal(text)) {
    return 0
  }

  let score = 0

  if (parseErrorCategory(text, status)) {
    score += 5
  }

  if (/traceback/i.test(text)) {
    score += 4
  }

  if (/line\s+\d+/i.test(text)) {
    score += 3
  }

  if (looksLikeErrorContent(text)) {
    score += 2
  }

  if (status === "Compilation Error" && looksLikeCompileError(text)) {
    score += 4
  }

  if (status === "Runtime Error" && looksLikeRuntimeOrSyntaxError(text)) {
    score += 4
  }

  if (text.includes("^")) {
    score += 2
  }

  if (text.length > 20) {
    score += 1
  }

  score -= text.length / 100

  return score > 0 ? score : 0
}

function extractMultilineErrorBlock(fullText: string, status: ResultStatus): string | null {
  const lines = fullText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (!isErrorStartLine(line, status)) {
      continue
    }

    const block = collectErrorLines(lines, i)

    if (block && block.length > 5) {
      return block
    }
  }

  return null
}

function isErrorStartLine(line: string, status: ResultStatus): boolean {
  if (ERROR_CATEGORY_PATTERNS.some(({ pattern }) => pattern.test(line))) {
    return true
  }

  if (/traceback/i.test(line)) {
    return true
  }

  if (status === "Compilation Error" && looksLikeCompileError(line)) {
    return true
  }

  if (status === "Runtime Error" && looksLikeRuntimeOrSyntaxError(line)) {
    return true
  }

  return false
}

function collectErrorLines(lines: string[], startIndex: number): string | null {
  const collected: string[] = [lines[startIndex]!]
  const maxLines = 12

  for (let i = startIndex + 1; i < lines.length && collected.length < maxLines; i += 1) {
    const line = lines[i]!

    if (
      /^(accepted|wrong answer|runtime error|compile error|compilation error)$/i.test(line)
    ) {
      break
    }

    collected.push(line)
  }

  const text = collected.join("\n").trim()
  return text.length > 0 ? text : null
}

function extractErrorFromPlainText(fullText: string, status: ResultStatus): string | null {
  const multiline = extractMultilineErrorBlock(fullText, status)
  if (multiline) return multiline

  const lines = fullText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (!/^(compilation error|compile error|runtime error)$/i.test(line)) {
      continue
    }

    const following = lines.slice(i + 1, i + 10).join("\n").trim()

    if (following && looksLikeErrorContent(following)) {
      return normalizeMultiline(following)
    }
  }

  for (const line of lines) {
    if (status === "Compilation Error" && looksLikeCompileError(line)) {
      return line
    }

    if (status === "Runtime Error" && looksLikeRuntimeOrSyntaxError(line)) {
      return line
    }
  }

  return null
}

function parseErrorCategory(text: string, status: ResultStatus): string | null {
  for (const { category, pattern } of ERROR_CATEGORY_PATTERNS) {
    if (pattern.test(text)) {
      return category
    }
  }

  if (status === "Compilation Error") {
    return "CompileError"
  }

  if (/traceback/i.test(text)) {
    return "Traceback"
  }

  if (looksLikeErrorContent(text)) {
    return "Error"
  }

  return null
}

function looksLikeCompileError(text: string): boolean {
  return (
    /line\s+\d+/i.test(text) ||
    /error:/i.test(text) ||
    /expected .* before/i.test(text) ||
    /syntax error/i.test(text) ||
    /was not declared/i.test(text) ||
    /undeclared identifier/i.test(text) ||
    /missing return/i.test(text)
  )
}

function looksLikeRuntimeOrSyntaxError(text: string): boolean {
  return (
    looksLikeRuntimeError(text) ||
    /\bSyntaxError\b/i.test(text) ||
    /\bTypeError\b/i.test(text) ||
    /\bNameError\b/i.test(text) ||
    /\bIndexError\b/i.test(text) ||
    /invalid syntax/i.test(text) ||
    /traceback/i.test(text)
  )
}

function looksLikeRuntimeError(text: string): boolean {
  return (
    /segmentation fault/i.test(text) ||
    /heap-buffer-overflow/i.test(text) ||
    /null pointer/i.test(text) ||
    /stack overflow/i.test(text) ||
    /index out of/i.test(text) ||
    /division by zero/i.test(text) ||
    /runtime error/i.test(text)
  )
}

function looksLikeErrorContent(text: string): boolean {
  const lower = text.toLowerCase()

  return ERROR_DISCOVERY_MARKERS.some((marker) => lower.includes(marker))
}

function isStatusOnlyText(text: string): boolean {
  return /^(accepted|wrong answer|runtime error|compilation error|compile error|time limit exceeded|memory limit exceeded)$/i.test(
    text.trim()
  )
}

function normalizeMultiline(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function isLabelText(text: string): boolean {
  const normalized = text.trim().toLowerCase()

  return (
    INPUT_LABELS.includes(normalized) ||
    OUTPUT_LABELS.includes(normalized) ||
    EXPECTED_LABELS.includes(normalized) ||
    RUNTIME_LABELS.includes(normalized) ||
    MEMORY_LABELS.includes(normalized) ||
    /^(input|output|expected|stdout|runtime|memory)$/i.test(normalized)
  )
}

function normalizeValue(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

function hasAnyExtractedField(result: ResultData): boolean {
  return (
    result.passed != null ||
    result.total != null ||
    result.runtime != null ||
    result.memory != null ||
    result.failedInput != null ||
    result.actualOutput != null ||
    result.expectedOutput != null ||
    result.errorText != null ||
    result.errorCategory != null
  )
}

function logExtractionSummary(
  result: ResultData,
  expectedSource: ExtractionSource,
  sourcePanel: ResultSourcePanel
): void {
  resultDebugLog("Extraction summary", {
    expectedSource,
    sourcePanel,
    confidence: result.confidence,
    status: result.status,
    passed: result.passed,
    total: result.total,
    failedInput: Boolean(result.failedInput),
    actualOutput: Boolean(result.actualOutput),
    expectedOutput: Boolean(result.expectedOutput),
    errorText: Boolean(result.errorText),
    errorCategory: result.errorCategory,
    runtime: result.runtime,
    memory: result.memory
  })
}
