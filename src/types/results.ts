export const RESULT_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Compilation Error",
  "Unknown"
] as const

export type ResultStatus = (typeof RESULT_STATUSES)[number]

export type ResultSourcePanel = "run" | "submit" | "unknown"

export interface ResultData {
  status: ResultStatus
  passed?: number | null
  total?: number | null
  runtime?: string | null
  memory?: string | null
  failedInput?: string | null
  actualOutput?: string | null
  expectedOutput?: string | null
  errorText?: string | null
  errorCategory?: string | null
  sourcePanel?: ResultSourcePanel
  confidence?: number
}

/** @deprecated Use ResultData */
export type ResultMetadata = ResultData

export function createEmptyResultData(status: ResultStatus = "Unknown"): ResultData {
  return {
    status,
    passed: null,
    total: null,
    runtime: null,
    memory: null,
    failedInput: null,
    actualOutput: null,
    expectedOutput: null,
    errorText: null,
    errorCategory: null,
    sourcePanel: "unknown",
    confidence: 0
  }
}

export function resultDataToRecord(result: ResultData): Record<string, unknown> {
  const record: Record<string, unknown> = {
    status: result.status,
    sourcePanel: result.sourcePanel ?? "unknown",
    confidence: result.confidence ?? 0
  }

  if (result.passed != null) record.passed = result.passed
  if (result.total != null) record.total = result.total
  if (result.runtime != null) record.runtime = result.runtime
  if (result.memory != null) record.memory = result.memory
  if (result.failedInput != null) record.failedInput = result.failedInput
  if (result.actualOutput != null) record.actualOutput = result.actualOutput
  if (result.expectedOutput != null) record.expectedOutput = result.expectedOutput
  if (result.errorText != null) record.errorText = result.errorText
  if (result.errorCategory != null) record.errorCategory = result.errorCategory

  return record
}

export function mergeResultData(
  current: ResultData | null,
  incoming: Partial<ResultData>
): ResultData {
  const base = current ?? createEmptyResultData("Unknown")

  return {
    status: incoming.status && incoming.status !== "Unknown" ? incoming.status : base.status,
    passed: incoming.passed ?? base.passed ?? null,
    total: incoming.total ?? base.total ?? null,
    runtime: incoming.runtime ?? base.runtime ?? null,
    memory: incoming.memory ?? base.memory ?? null,
    failedInput: incoming.failedInput ?? base.failedInput ?? null,
    actualOutput: incoming.actualOutput ?? base.actualOutput ?? null,
    expectedOutput: incoming.expectedOutput ?? base.expectedOutput ?? null,
    errorText: incoming.errorText ?? base.errorText ?? null,
    errorCategory: incoming.errorCategory ?? base.errorCategory ?? null,
    sourcePanel: incoming.sourcePanel ?? base.sourcePanel ?? "unknown",
    confidence: Math.max(incoming.confidence ?? 0, base.confidence ?? 0)
  }
}

export function isResultDataEnriched(result: ResultData): boolean {
  return (
    result.passed != null ||
    result.total != null ||
    result.failedInput != null ||
    result.actualOutput != null ||
    result.expectedOutput != null ||
    result.runtime != null ||
    result.memory != null ||
    result.errorText != null ||
    result.errorCategory != null
  )
}

export function isErrorResultStatus(status: ResultStatus): boolean {
  return status === "Compilation Error" || status === "Runtime Error"
}

export function isExtractionComplete(result: ResultData): boolean {
  if (result.status === "Unknown") {
    return false
  }

  if (result.status === "Accepted") {
    return Boolean(result.runtime) && Boolean(result.memory)
  }

  if (result.status === "Wrong Answer") {
    return (
      Boolean(result.failedInput) ||
      Boolean(result.actualOutput) ||
      Boolean(result.expectedOutput)
    )
  }

  if (isErrorResultStatus(result.status)) {
    return Boolean(result.errorText)
  }

  if (
    result.status === "Time Limit Exceeded" ||
    result.status === "Memory Limit Exceeded"
  ) {
    return true
  }

  return isResultDataEnriched(result)
}

export function calculateResultConfidence(result: Partial<ResultData>): number {
  let score = 0

  if (result.status && result.status !== "Unknown") {
    score += 0.12
  }

  if (result.passed != null && result.total != null) {
    score += 0.12
  }

  if (result.failedInput) {
    score += 0.1
  }

  if (result.actualOutput) {
    score += 0.1
  }

  if (result.expectedOutput) {
    score += 0.1
  }

  if (result.runtime) {
    score += 0.1
  }

  if (result.memory) {
    score += 0.1
  }

  if (result.errorText) {
    score += 0.16
  }

  if (result.errorCategory) {
    score += 0.1
  }

  return Math.round(Math.min(1, score) * 100) / 100
}
