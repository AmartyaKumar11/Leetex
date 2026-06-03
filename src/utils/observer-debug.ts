import { OBSERVER_DEBUG_STORAGE_KEY } from "~/constants/observer"

declare global {
  interface Window {
    LEETEX_DEBUG_OBSERVER?: boolean
  }
}

export function isObserverDebugEnabled(): boolean {
  if (typeof window !== "undefined" && window.LEETEX_DEBUG_OBSERVER === true) {
    return true
  }

  try {
    return localStorage.getItem(OBSERVER_DEBUG_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function observerDebugLog(phase: string, payload?: unknown): void {
  if (!isObserverDebugEnabled()) {
    return
  }

  const prefix = "[LeetEx:Observer]"

  if (payload !== undefined) {
    console.info(prefix, phase, payload)
    return
  }

  console.info(prefix, phase)
}
