export interface SessionMetrics {
  timeToFirstEdit: number | null
  timeToFirstRun: number | null
  timeToFirstSubmit: number | null
  totalRuns: number
  totalSubmissions: number
  totalSnapshots: number
  totalActiveDuration: number
  sessionDuration: number
}

export function createEmptySessionMetrics(): SessionMetrics {
  return {
    timeToFirstEdit: null,
    timeToFirstRun: null,
    timeToFirstSubmit: null,
    totalRuns: 0,
    totalSubmissions: 0,
    totalSnapshots: 0,
    totalActiveDuration: 0,
    sessionDuration: 0
  }
}
