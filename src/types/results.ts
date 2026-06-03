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
    result.memory != null
  )
}

export function calculateResultConfidence(result: Partial<ResultData>): number {
  let score = 0

  if (result.status && result.status !== "Unknown") {
    score += 0.4
  }

  if (result.passed != null && result.total != null) {
    score += 0.2
  }

  if (result.actualOutput) {
    score += 0.2
  }

  if (result.expectedOutput) {
    score += 0.2
  }

  return Math.round(score * 100) / 100
}
