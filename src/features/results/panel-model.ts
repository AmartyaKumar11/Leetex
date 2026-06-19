import {
  calculateResultConfidence,
  createEmptyResultData,
  RESULT_STATUSES,
  type ResultData,
  type ResultStatus
} from "~/types/results"
import { isResultDebugEnabled } from "~/utils/result-extraction-debug"
import {
  CONSOLE_RESULT_LOCATOR,
  SUBMISSION_RESULT_LOCATOR,
  TESTCASE_RESULT_LOCATOR
} from "~/features/results/panel-discovery"

export interface PanelModel {
  status: string | null
  runtime: string | null
  memory: string | null
  sections: Record<string, string>
  rawText: string
}

const STATUS_LOCATORS = [
  CONSOLE_RESULT_LOCATOR,
  SUBMISSION_RESULT_LOCATOR,
  TESTCASE_RESULT_LOCATOR
] as const

const SECTION_ALIASES: Record<string, string[]> = {
  Error: ["error", "stderr"]
}

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

const ERROR_BLOCK_SIGNAL =
  /\b(SyntaxError|TypeError|IndexError|KeyError|NameError|RuntimeError|Exception)\b|Traceback|line\s+\d+|error:|invalid syntax/i

const PASSED_TOTAL_PATTERNS = [
  /(\d+)\s*\/\s*(\d+)\s*test\s*cases?\s*passed/i,
  /passed\s+(\d+)\s*\/\s*(\d+)\s*test\s*cases?/i,
  /passed\s*:?\s*(\d+)\s*\/\s*(\d+)/i,
  /(\d+)\s+of\s+(\d+)\s+test\s*cases?\s*passed/i,
  /(\d+)\s*\/\s*(\d+)\s*testcases?\s*passed/i,
  /(\d+)\s*\/\s*(\d+)\s*testcases?/i
] as const

const RUNTIME_VALUE_PATTERN = /\d+\s*ms/i
const MEMORY_VALUE_PATTERN = /[\d.]+\s*(?:MB|KB|GB|bytes?)/i

const SECTION_CONTAINER_SELECTOR = "div.flex.h-full.w-full.flex-col.space-y-2"
const VALUE_NODE_SELECTOR = ".relative.mx-3.whitespace-pre-wrap"
const INPUT_VALUE_NODE_SELECTOR = ".font-menlo.mx-3.whitespace-pre-wrap"

const EXACT_SECTION_HEADERS = {
  Input: ["Input", "Last Executed Input"],
  Output: ["Output"],
  Expected: ["Expected"]
} as const

export function extractPanelModel(panel: Element): PanelModel {
  const rawText = panel.textContent ?? ""

  const model: PanelModel = {
    status: extractStatusFromPanel(panel),
    runtime: extractRuntimeFromPanel(panel),
    memory: extractMemoryFromPanel(panel),
    sections: discoverSections(panel),
    rawText
  }

  if (!model.sections.Error) {
    const errorBlock = findUnlabeledErrorBlock(panel, model.sections)

    if (errorBlock) {
      model.sections.Error = errorBlock
    }
  }

  if (isResultDebugEnabled()) {
    console.info("[LeetEx Panel Model]", {
      status: model.status,
      runtime: model.runtime,
      memory: model.memory,
      sections: model.sections
    })
  }

  return model
}

export function normalizePanelModel(model: PanelModel): ResultData {
  const status = parseResultStatus(model.status)
  const result = createEmptyResultData(status)

  result.runtime = model.runtime
  result.memory = model.memory

  if (model.sections.Input) {
    result.failedInput = model.sections.Input
  }

  if (model.sections.Output) {
    result.actualOutput = model.sections.Output
  }

  if (model.sections.Expected) {
    result.expectedOutput = model.sections.Expected
  }

  if (model.sections.Error) {
    result.errorText = model.sections.Error
    result.errorCategory = parseErrorCategory(model.sections.Error, status)
  }

  const passedTotal = extractPassedTotalFromText(model.rawText)

  if (passedTotal) {
    result.passed = passedTotal.passed
    result.total = passedTotal.total
  }

  result.confidence = calculateResultConfidence(result)

  if (isResultDebugEnabled()) {
    console.info("[LeetEx Normalized Result]", {
      status: result.status,
      failedInput: result.failedInput,
      actualOutput: result.actualOutput,
      expectedOutput: result.expectedOutput,
      errorText: result.errorText,
      runtime: result.runtime,
      memory: result.memory
    })
  }

  return result
}

function extractStatusFromPanel(panel: Element): string | null {
  for (const locator of STATUS_LOCATORS) {
    const statusEl = panel.querySelector(locator)

    if (!statusEl) {
      continue
    }

    const label = (getDirectText(statusEl).trim() || statusEl.textContent?.trim() || "")

    if (label) {
      return label
    }
  }

  return null
}

function extractRuntimeFromPanel(panel: Element): string | null {
  const fromCard = extractMetricFromCard(panel, "Runtime")

  if (fromCard) {
    return fromCard.value
  }

  return extractMetricFromPanel(panel, "runtime", RUNTIME_VALUE_PATTERN)
}

function extractMemoryFromPanel(panel: Element): string | null {
  const fromCard = extractMetricFromCard(panel, "Memory")

  if (fromCard) {
    return fromCard.value
  }

  return extractMetricFromPanel(panel, "memory", MEMORY_VALUE_PATTERN)
}

function extractMetricFromCard(
  panel: Element,
  labelText: string
): { card: Element; value: string } | null {
  for (const labelNode of panel.querySelectorAll("*")) {
    if (!isMetricLabel(labelNode, labelText)) {
      continue
    }

    const card = findMetricCardContainer(labelNode)

    if (!card) {
      continue
    }

    const siblingValue = composeMetricFromSiblings(card, labelNode)
    const cardValue = composeMetricFromCard(card, labelText)
    const value = cardValue ?? siblingValue

    if (value) {
      return { card, value }
    }
  }

  return null
}

function isMetricLabel(element: Element, labelText: string): boolean {
  const trimmed = labelText.trim()

  return (
    getDirectText(element).trim() === trimmed || element.textContent?.trim() === trimmed
  )
}

function composeMetricFromSiblings(card: Element, labelNode: Element): string | null {
  const siblings = Array.from(card.children)
  const labelIndex = siblings.indexOf(labelNode)

  if (labelIndex < 0) {
    return null
  }

  let numericValue: string | null = null
  let unitValue: string | null = null

  for (const sibling of siblings.slice(labelIndex + 1)) {
    const direct = getDirectText(sibling).trim()

    if (!numericValue && /^[\d.]+$/.test(direct)) {
      numericValue = direct
      continue
    }

    if (!unitValue && /^(ms|MB|KB|GB|bytes?)$/i.test(direct)) {
      unitValue = direct
    }
  }

  if (!numericValue || !unitValue) {
    return null
  }

  return `${numericValue} ${unitValue}`
}

function findMetricCardContainer(labelNode: Element): Element | null {
  let current: Element | null = labelNode.parentElement

  while (current && !current.classList.contains("flexlayout__tab")) {
    const spans = [...current.querySelectorAll("span")]
    const hasNumericSpan = spans.some((span) => /^[\d.]+$/.test(getDirectText(span).trim()))
    const hasUnitSpan = spans.some((span) =>
      /^(ms|MB|KB|GB|bytes?)$/i.test(getDirectText(span).trim())
    )

    if (hasNumericSpan && hasUnitSpan) {
      return current
    }

    current = current.parentElement
  }

  return labelNode.parentElement
}

function composeMetricFromCard(card: Element, labelText: string): string | null {
  const spans = [...card.querySelectorAll("span")]
  const numericSpan = spans.find((span) => /^[\d.]+$/.test(getDirectText(span).trim()))
  const unitSpan = spans.find((span) =>
    /^(ms|MB|KB|GB|bytes?)$/i.test(getDirectText(span).trim())
  )

  if (!numericSpan || !unitSpan) {
    const inner = card.textContent?.replace(/\s+/g, " ").trim() ?? ""
    const withoutLabel = inner.replace(new RegExp(`^${labelText}\\s*`, "i"), "").trim()

    return withoutLabel || null
  }

  return `${getDirectText(numericSpan).trim()} ${getDirectText(unitSpan).trim()}`
}

function extractMetricFromPanel(
  panel: Element,
  label: string,
  valuePattern: RegExp
): string | null {
  const normalizedLabel = label.toLowerCase()

  for (const element of panel.querySelectorAll("*")) {
    const direct = getDirectText(element).trim().toLowerCase()

    if (direct !== normalizedLabel && !direct.startsWith(`${normalizedLabel}:`)) {
      continue
    }

    const fromSibling = readValueNearLabel(element, valuePattern)

    if (fromSibling) {
      return fromSibling
    }
  }

  for (const element of panel.querySelectorAll("span, div, p")) {
    const text = getDirectText(element).trim()

    if (valuePattern.test(text)) {
      return text.match(valuePattern)?.[0] ?? text
    }
  }

  return null
}

function discoverSections(panel: Element): Record<string, string> {
  const sections: Record<string, string> = {}

  const input = extractInputSection(panel)

  if (input) {
    sections.Input = input
  }

  const output = extractValueSection(panel, "Output")

  if (output) {
    sections.Output = output
  }

  const expected = extractValueSection(panel, "Expected")

  if (expected) {
    sections.Expected = expected
  }

  return sections
}

function extractValueSection(panel: Element, headerText: string): string | null {
  const container = findSectionContainer(panel, headerText)

  if (!container) {
    return null
  }

  const valueNode = container.querySelector(VALUE_NODE_SELECTOR)

  if (!valueNode) {
    return null
  }

  return normalizeMultiline(valueNode.textContent ?? "")
}

function extractInputSection(panel: Element): string | null {
  for (const headerText of EXACT_SECTION_HEADERS.Input) {
    const container = findSectionContainer(panel, headerText)

    if (!container) {
      continue
    }

    const serialized = serializeInputParameters(container)

    if (serialized) {
      return serialized
    }
  }

  return null
}

function findSectionContainer(panel: Element, headerText: string): Element | null {
  for (const container of panel.querySelectorAll(SECTION_CONTAINER_SELECTOR)) {
    if (containerHasExactHeader(container, headerText)) {
      return container
    }
  }

  for (const element of panel.querySelectorAll("span, div, p, label")) {
    if (getDirectText(element).trim() !== headerText) {
      continue
    }

    const container =
      element.closest(SECTION_CONTAINER_SELECTOR) ??
      element.closest("div.flex.flex-col.space-y-2")

    if (container && containerHasExactHeader(container, headerText)) {
      return container
    }

    let candidate = element.nextElementSibling

    while (
      candidate &&
      (candidate.tagName === "HR" || candidate.textContent?.trim() === "")
    ) {
      candidate = candidate.nextElementSibling
    }

    if (candidate) {
      return candidate
    }
  }

  return null
}

function containerHasExactHeader(container: Element, headerText: string): boolean {
  for (const element of container.querySelectorAll("span, div, p, label")) {
    if (getDirectText(element).trim() === headerText) {
      return true
    }
  }

  return false
}

function serializeInputParameters(container: Element): string | null {
  const parameters: string[] = []

  for (const block of container.children) {
    const parameter = extractParameterFromBlock(block)

    if (parameter) {
      parameters.push(parameter)
    }
  }

  if (parameters.length === 0) {
    for (const element of container.querySelectorAll("span, div, p, label")) {
      const direct = getDirectText(element).trim()
      const match = direct.match(/^([a-zA-Z_][\w]*)\s*=$/)

      if (!match) {
        continue
      }

      const value = findParameterValueNode(element, container)

      if (value) {
        parameters.push(`${match[1]}=${compactParameterValue(value)}`)
      }
    }
  }

  return parameters.length > 0 ? parameters.join("\n") : null
}

function extractParameterFromBlock(block: Element): string | null {
  let paramName: string | null = null

  for (const element of block.querySelectorAll("span, div, p, label")) {
    const direct = getDirectText(element).trim()
    const match = direct.match(/^([a-zA-Z_][\w]*)\s*=$/)

    if (match) {
      paramName = match[1] ?? null
      break
    }
  }

  if (!paramName) {
    return null
  }

  const valueNode = block.querySelector(INPUT_VALUE_NODE_SELECTOR)

  if (!valueNode) {
    return null
  }

  const value = normalizeMultiline(valueNode.textContent ?? "")

  if (!value) {
    return null
  }

  return `${paramName}=${compactParameterValue(value)}`
}

function findParameterValueNode(labelElement: Element, container: Element): string | null {
  const block =
    labelElement.closest("div.flex.flex-col") ??
    labelElement.parentElement ??
    container

  const valueNode = block.querySelector(VALUE_NODE_SELECTOR)

  if (!valueNode || valueNode === labelElement || labelElement.contains(valueNode)) {
    return null
  }

  return normalizeMultiline(valueNode.textContent ?? "")
}

function compactParameterValue(value: string): string {
  return value.replace(/\s*\n\s*/g, "").replace(/,\s+/g, ",").trim()
}

function findUnlabeledErrorBlock(
  panel: Element,
  sections: Record<string, string>
): string | null {
  const claimed = new Set(Object.values(sections).map((value) => normalizeMultiline(value)))

  let best: { score: number; text: string } | null = null

  for (const element of panel.querySelectorAll("div.whitespace-pre-wrap, pre, code")) {
    const text = normalizeMultiline(element.textContent ?? "")

    if (!text || text.length < 4 || claimed.has(text)) {
      continue
    }

    if (!ERROR_BLOCK_SIGNAL.test(text)) {
      continue
    }

    const score = scoreErrorBlock(text)

    if (!best || score > best.score) {
      best = { score, text }
    }
  }

  return best?.text ?? null
}

function scoreErrorBlock(text: string): number {
  let score = 0

  if (ERROR_CATEGORY_PATTERNS.some(({ pattern }) => pattern.test(text))) {
    score += 5
  }

  if (/traceback/i.test(text)) {
    score += 4
  }

  if (/line\s+\d+/i.test(text)) {
    score += 3
  }

  score -= text.length / 100

  return score
}

function parseResultStatus(raw: string | null): ResultStatus {
  if (!raw) {
    return "Unknown"
  }

  const normalized = raw.trim()

  if (normalized.toLowerCase() === "compile error") {
    return "Compilation Error"
  }

  for (const status of RESULT_STATUSES) {
    if (status !== "Unknown" && normalized.toLowerCase() === status.toLowerCase()) {
      return status
    }
  }

  const lower = normalized.toLowerCase()

  if (lower.includes("wrong answer")) {
    return "Wrong Answer"
  }

  if (lower.includes("runtime error")) {
    return "Runtime Error"
  }

  if (lower.includes("compilation error") || lower.includes("compile error")) {
    return "Compilation Error"
  }

  if (lower.includes("accepted")) {
    return "Accepted"
  }

  if (lower.includes("time limit exceeded")) {
    return "Time Limit Exceeded"
  }

  if (lower.includes("memory limit exceeded")) {
    return "Memory Limit Exceeded"
  }

  return "Unknown"
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

  if (ERROR_BLOCK_SIGNAL.test(text)) {
    return "Error"
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

  return null
}

function readValueNearLabel(labelElement: Element, valuePattern: RegExp): string | null {
  const parent = labelElement.parentElement

  if (!parent) {
    return null
  }

  const siblings = Array.from(parent.children)
  const index = siblings.indexOf(labelElement)

  for (let i = index + 1; i < siblings.length; i += 1) {
    const valueNode = siblings[i]!.querySelector(VALUE_NODE_SELECTOR) ?? siblings[i]
    const text = normalizeMultiline(valueNode.textContent ?? "")

    if (text && valuePattern.test(text)) {
      return text.match(valuePattern)?.[0] ?? text
    }
  }

  return null
}

function getDirectText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
}

function normalizeMultiline(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
