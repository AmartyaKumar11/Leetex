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

export interface ResultData {
  status: ResultStatus
  passed?: number | null
  total?: number | null
  runtime?: string | null
  memory?: string | null
  failedInput?: string | null
  actualOutput?: string | null
  expectedOutput?: string | null
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
    expectedOutput: null
  }
}

export function resultDataToRecord(result: ResultData): Record<string, unknown> {
  const record: Record<string, unknown> = { status: result.status }

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
    expectedOutput: incoming.expectedOutput ?? base.expectedOutput ?? null
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
