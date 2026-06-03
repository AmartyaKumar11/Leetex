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

  const prefix = "[LeetEx:Results]"

  if (payload !== undefined) {
    console.info(prefix, phase, payload)
    return
  }

  console.info(prefix, phase)
}

export function resultDebugWarn(phase: string, payload?: unknown): void {
  if (!isResultDebugEnabled()) {
    return
  }

  console.warn("[LeetEx:Results]", phase, payload)
}
