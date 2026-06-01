import cssText from "data-text:./leetcode-sidebar.css"

import type { PlasmoCSConfig } from "plasmo"
import { useEffect } from "react"

import { LeetCodeSidebar } from "~/components/leetcode-sidebar"
import { leetcodeSessionObserver } from "~/observers/leetcode-session-observer"

export const config: PlasmoCSConfig = {
  matches: [
    "https://leetcode.com/problems/*",
    "https://leetcode.com/problems/*/*",
    "https://leetcode.com/problems/*/*/*"
  ],
  run_at: "document_idle"
}

export const getStyle = (): HTMLStyleElement => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function LeetCodeObserverUI() {
  useEffect(() => {
    console.info("[LeetEx] Observer mounted on", location.href)
    void leetcodeSessionObserver.start()

    return () => {
      leetcodeSessionObserver.stop()
    }
  }, [])

  return <LeetCodeSidebar />
}
