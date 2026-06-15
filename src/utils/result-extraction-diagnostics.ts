import type { ResultData, ResultStatus } from "~/types/results"
import { isErrorResultStatus, isExtractionComplete } from "~/types/results"
import { isResultDebugEnabled } from "~/utils/result-extraction-debug"

export type DiagnosticCategory =
  | "Runtime Error"
  | "Compile Error"
  | "Input"
  | "Output"
  | "Expected"
  | "Runtime"
  | "Memory"
  | "Error Block"

export interface DiagnosticCandidate {
  category: DiagnosticCategory
  timestamp: number
  attempt: number
  tagName: string
  depth: number
  textPreview: string
  nodePath: string
  isNewThisAttempt: boolean
  appearedAfterStatus: boolean
}

interface DiagnosticSession {
  captureId: string
  kind: string
  startedAt: number
  attempt: number
  firstStatusAt: number | null
  firstStatusAttempt: number | null
  firstStatusValue: ResultStatus | null
  seenFingerprints: Map<string, number>
  candidates: DiagnosticCandidate[]
  ruleOutcomes: { rule: string; success: boolean; detail?: unknown; timestamp: number }[]
}

let activeSession: DiagnosticSession | null = null

const PREFIX = "[LeetEx Result Extractor]"

export function beginResultDiagnostics(captureId: string, kind: string): void {
  if (!isResultDebugEnabled()) {
    activeSession = null
    return
  }

  activeSession = {
    captureId,
    kind,
    startedAt: Date.now(),
    attempt: 0,
    firstStatusAt: null,
    firstStatusAttempt: null,
    firstStatusValue: null,
    seenFingerprints: new Map(),
    candidates: [],
    ruleOutcomes: []
  }

  console.info(PREFIX, "Diagnostic session started", {
    captureId,
    kind,
    timestamp: activeSession.startedAt
  })
}

export function setDiagnosticAttempt(attempt: number): void {
  if (!activeSession) {
    return
  }

  activeSession.attempt = attempt
}

export function logStatusDetected(
  status: ResultStatus,
  element?: Element | null
): void {
  if (!activeSession) {
    return
  }

  const now = Date.now()

  if (activeSession.firstStatusAt === null) {
    activeSession.firstStatusAt = now
    activeSession.firstStatusAttempt = activeSession.attempt
    activeSession.firstStatusValue = status

    console.info(PREFIX, "Status detected (first)", {
      status,
      attempt: activeSession.attempt,
      timestamp: now,
      elapsedMs: now - activeSession.startedAt,
      node: element ? describeNode(element) : null
    })
    return
  }

  console.info(PREFIX, "Status detected (subsequent)", {
    status,
    attempt: activeSession.attempt,
    timestamp: now,
    firstDetectedAt: activeSession.firstStatusAt,
    firstDetectedAttempt: activeSession.firstStatusAttempt
  })
}

export function logDiagnosticRule(
  rule: string,
  success: boolean,
  detail?: unknown
): void {
  if (!activeSession) {
    return
  }

  const entry = {
    rule,
    success,
    detail,
    timestamp: Date.now()
  }

  activeSession.ruleOutcomes.push(entry)

  const label = success ? "Rule passed" : "Rule failed"

  console.info(PREFIX, label, {
    ...entry,
    attempt: activeSession.attempt
  })
}

export function scanDiagnosticCandidates(root: Element): void {
  if (!activeSession) {
    return
  }

  for (const element of root.querySelectorAll("*")) {
    const direct = getDirectText(element).trim()
    const full = element.textContent?.trim() ?? ""

    if (!direct && full.length > 200) {
      continue
    }

    const label = direct || full.slice(0, 48)

    if (matchesCategory(label, /^runtime error$/i)) {
      logCandidate("Runtime Error", element)
    }

    if (matchesCategory(label, /^(compilation error|compile error)$/i)) {
      logCandidate("Compile Error", element)
    }

    if (matchesLabel(direct, ["input", "stdin", "your input", "testcase input"])) {
      logCandidate("Input", element)
    }

    if (
      matchesLabel(direct, ["output", "stdout", "your output", "actual output", "actual"])
    ) {
      logCandidate("Output", element)
    }

    if (matchesLabel(direct, ["expected", "expected output", "expected answer"])) {
      logCandidate("Expected", element)
    }

    if (matchesLabel(direct, ["runtime", "execution time"])) {
      logCandidate("Runtime", element)
    }

    if (matchesLabel(direct, ["memory", "memory usage"])) {
      logCandidate("Memory", element)
    }

    if (looksLikeErrorBlock(full)) {
      logCandidate("Error Block", element)
    }

    if (/^\d+\s*ms$/i.test(direct)) {
      logCandidate("Runtime", element, { matchedBy: "value-chip" })
    }

    if (/^[\d.]+\s*MB$/i.test(direct)) {
      logCandidate("Memory", element, { matchedBy: "value-chip" })
    }
  }
}

export function evaluateAndLogRuleFailures(result: ResultData): void {
  if (!activeSession) {
    return
  }

  const rules = buildRuleChecks(result)

  for (const { rule, passed, detail } of rules) {
    logDiagnosticRule(rule, passed, detail)
  }
}

export function endResultDiagnostics(result: ResultData, reason: string): void {
  if (!activeSession) {
    return
  }

  evaluateAndLogRuleFailures(result)

  const lateCandidates = activeSession.candidates.filter(
    (c) => c.appearedAfterStatus && c.attempt > (activeSession!.firstStatusAttempt ?? 0)
  )

  console.info(PREFIX, "Diagnostic session ended", {
    captureId: activeSession.captureId,
    kind: activeSession.kind,
    reason,
    attempts: activeSession.attempt,
    firstStatus: {
      value: activeSession.firstStatusValue,
      attempt: activeSession.firstStatusAttempt,
      timestamp: activeSession.firstStatusAt,
      elapsedMs:
        activeSession.firstStatusAt !== null
          ? activeSession.firstStatusAt - activeSession.startedAt
          : null
    },
    extractionComplete: isExtractionComplete(result),
    totalCandidates: activeSession.candidates.length,
    candidatesAfterStatus: activeSession.candidates.filter((c) => c.appearedAfterStatus)
      .length,
    failedRules: activeSession.ruleOutcomes.filter((r) => !r.success).map((r) => r.rule),
    result: {
      status: result.status,
      errorText: Boolean(result.errorText),
      errorCategory: result.errorCategory,
      runtime: result.runtime,
      memory: result.memory,
      failedInput: Boolean(result.failedInput),
      actualOutput: Boolean(result.actualOutput),
      expectedOutput: Boolean(result.expectedOutput),
      passed: result.passed,
      total: result.total
    }
  })

  if (lateCandidates.length > 0) {
    console.info(PREFIX, "Late-arriving candidates (after first status)", lateCandidates)
  }

  activeSession = null
}

function logCandidate(
  category: DiagnosticCategory,
  element: Element,
  meta?: Record<string, unknown>
): void {
  if (!activeSession) {
    return
  }

  const textPreview = (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300)
  const fingerprint = `${category}:${element.tagName}:${textPreview.slice(0, 80)}:${getNodeDepth(element)}`
  const firstSeenAttempt = activeSession.seenFingerprints.get(fingerprint)
  const isNewThisAttempt = firstSeenAttempt === undefined

  if (firstSeenAttempt === undefined) {
    activeSession.seenFingerprints.set(fingerprint, activeSession.attempt)
  }

  const appearedAfterStatus =
    activeSession.firstStatusAt !== null &&
    activeSession.attempt > (activeSession.firstStatusAttempt ?? 0) &&
    isNewThisAttempt

  const candidate: DiagnosticCandidate = {
    category,
    timestamp: Date.now(),
    attempt: activeSession.attempt,
    tagName: element.tagName.toLowerCase(),
    depth: getNodeDepth(element),
    textPreview,
    nodePath: describeNode(element),
    isNewThisAttempt,
    appearedAfterStatus
  }

  activeSession.candidates.push(candidate)

  console.info(PREFIX, "Candidate node", {
    ...candidate,
    ...meta,
    firstSeenAttempt: firstSeenAttempt ?? activeSession.attempt,
    msSinceSessionStart: candidate.timestamp - activeSession.startedAt
  })

  if (appearedAfterStatus) {
    console.info(PREFIX, "Candidate appeared AFTER first status detection", candidate)
  }
}

function buildRuleChecks(result: ResultData): {
  rule: string
  passed: boolean
  detail?: unknown
}[] {
  const checks: { rule: string; passed: boolean; detail?: unknown }[] = []

  checks.push({
    rule: "status.detected",
    passed: result.status !== "Unknown",
    detail: { status: result.status }
  })

  if (result.status === "Accepted") {
    checks.push({
      rule: "accepted.runtime",
      passed: Boolean(result.runtime),
      detail: { runtime: result.runtime }
    })
    checks.push({
      rule: "accepted.memory",
      passed: Boolean(result.memory),
      detail: { memory: result.memory }
    })
    checks.push({
      rule: "accepted.runtime_or_memory",
      passed: Boolean(result.runtime) || Boolean(result.memory),
      detail: { runtime: result.runtime, memory: result.memory }
    })
  }

  if (result.status === "Wrong Answer") {
    checks.push({
      rule: "wrong_answer.failed_input",
      passed: Boolean(result.failedInput),
      detail: { failedInput: result.failedInput?.slice(0, 80) ?? null }
    })
    checks.push({
      rule: "wrong_answer.actual_output",
      passed: Boolean(result.actualOutput),
      detail: { actualOutput: result.actualOutput?.slice(0, 80) ?? null }
    })
    checks.push({
      rule: "wrong_answer.expected_output",
      passed: Boolean(result.expectedOutput),
      detail: { expectedOutput: result.expectedOutput?.slice(0, 80) ?? null }
    })
    checks.push({
      rule: "wrong_answer.passed_total",
      passed: true,
      detail: {
        optional: true,
        passed: result.passed,
        total: result.total,
        note: "Not directly exposed in LeetCode UI; derived metric only"
      }
    })
    checks.push({
      rule: "wrong_answer.label_value_extraction",
      passed:
        Boolean(result.failedInput) ||
        Boolean(result.actualOutput) ||
        Boolean(result.expectedOutput),
      detail: null
    })
  }

  if (isErrorResultStatus(result.status)) {
    checks.push({
      rule: "error.error_text",
      passed: Boolean(result.errorText),
      detail: { errorText: result.errorText?.slice(0, 120) ?? null }
    })
    checks.push({
      rule: "error.error_category",
      passed: Boolean(result.errorCategory),
      detail: { errorCategory: result.errorCategory }
    })
    checks.push({
      rule: "error.error_block_scoring",
      passed: Boolean(result.errorText),
      detail: { note: "best error block from pre/code/multiline scan" }
    })
    checks.push({
      rule: "error.error_section_traversal",
      passed: Boolean(result.errorText),
      detail: { note: "status header sibling/parent traversal" }
    })
  }

  checks.push({
    rule: "extraction.complete",
    passed: isExtractionComplete(result),
    detail: { status: result.status }
  })

  return checks
}

function matchesCategory(label: string, pattern: RegExp): boolean {
  return pattern.test(label)
}

function matchesLabel(direct: string, labels: string[]): boolean {
  const normalized = direct.toLowerCase()
  return labels.some((label) => normalized === label || normalized.startsWith(`${label}:`))
}

function looksLikeErrorBlock(text: string): boolean {
  return (
    /\bSyntaxError\b/i.test(text) ||
    /\bTraceback\b/i.test(text) ||
    /invalid syntax/i.test(text) ||
    /line\s+\d+/i.test(text) ||
    /segmentation fault/i.test(text) ||
    /heap-buffer-overflow/i.test(text) ||
    /expected .* before/i.test(text)
  )
}

function getDirectText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
}

function getNodeDepth(element: Element): number {
  let depth = 0
  let current: Element | null = element

  while (current?.parentElement) {
    depth += 1
    current = current.parentElement
  }

  return depth
}

function describeNode(element: Element): string {
  const id = element.id ? `#${element.id}` : ""
  const locator = element.getAttribute("data-e2e-locator")
  const locatorPart = locator ? `[${locator}]` : ""
  const className =
    typeof element.className === "string" && element.className
      ? `.${element.className.split(/\s+/).slice(0, 2).join(".")}`
      : ""

  return `${element.tagName.toLowerCase()}${id}${className}${locatorPart}`
}
