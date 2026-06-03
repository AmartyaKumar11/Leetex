export const RESULT_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Compilation Error"
] as const

export type ResultStatus = (typeof RESULT_STATUSES)[number]

export interface ResultMetadata {
  status: ResultStatus | string
  passed: number | null
  total: number | null
}
