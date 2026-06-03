/** Lightweight stable hash for debug logging (not cryptographic). */
export function hashCode(value: string): string {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

export function isFirstEditDebugEnabled(): boolean {
  try {
    return (
      localStorage.getItem("LEETEX_DEBUG_FIRST_EDIT") === "true" ||
      window.LEETEX_DEBUG_FIRST_EDIT === true
    )
  } catch {
    return false
  }
}

export function firstEditDebugLog(phase: string, payload?: unknown): void {
  if (!isFirstEditDebugEnabled()) {
    return
  }

  if (payload !== undefined) {
    console.info("[LeetEx:FirstEdit]", phase, payload)
    return
  }

  console.info("[LeetEx:FirstEdit]", phase)
}

declare global {
  interface Window {
    LEETEX_DEBUG_FIRST_EDIT?: boolean
  }
}
