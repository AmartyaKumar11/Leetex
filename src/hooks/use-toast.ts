import { useCallback, useEffect, useState } from "react"

export interface ToastState {
  message: string
  visible: boolean
}

export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false })

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true })
  }, [])

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  useEffect(() => {
    if (!toast.visible) {
      return
    }

    const timer = window.setTimeout(dismissToast, durationMs)
    return () => window.clearTimeout(timer)
  }, [toast.visible, durationMs, dismissToast])

  return { toast, showToast, dismissToast }
}
