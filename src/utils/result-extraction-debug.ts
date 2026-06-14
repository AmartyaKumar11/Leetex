import { RESULT_DEBUG_STORAGE_KEY } from "~/constants/result-extraction"

declare global {
  interface Window {
    LEETEX_DEBUG_RESULTS?: boolean
  }
}

export function isResultDebugEnabled(): boolean {
  if (typeof window !== "undefined" && window.LEETEX_DEBUG_RESULTS === true) {
    return true
  }

  try {
    return localStorage.getItem(RESULT_DEBUG_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function resultDebugLog(phase: string, payload?: unknown): void {
  if (!isResultDebugEnabled()) {
    return
  }

  const prefix = "[LeetEx Result Extractor]"

  if (payload !== undefined) {
    console.info(prefix, phase, payload)
    return
  }

  console.info(prefix, phase)
}

export function resultDebugField(field: string, value: unknown): void {
  if (!isResultDebugEnabled()) {
    return
  }

  console.info(`[LeetEx Result Extractor] ${field}`, value)
}

export function resultDebugWarn(phase: string, payload?: unknown): void {
  if (!isResultDebugEnabled()) {
    return
  }

  console.warn("[LeetEx Result Extractor]", phase, payload)
}
