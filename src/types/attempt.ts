import type { ResultData } from "~/types/results"

export type AttemptType = "RUN" | "SUBMIT"

export interface AttemptRecord extends ResultData {
  type: AttemptType
  timestamp: number
}
