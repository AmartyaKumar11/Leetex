import type { ResultStatus } from "~/types/results"

export type AttemptType = "RUN" | "SUBMIT"

export interface AttemptRecord {
  type: AttemptType
  status: ResultStatus | string
  passed: number | null
  total: number | null
  timestamp: number
}
