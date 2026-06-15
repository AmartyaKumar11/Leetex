import type { ResultSourcePanel } from "~/types/results"

export type ExtractionSource = "run" | "submit"

const FLEXLAYOUT_TAB_SELECTOR = ".flexlayout__tab"

export const CONSOLE_RESULT_LOCATOR = '[data-e2e-locator="console-result"]'
export const SUBMISSION_RESULT_LOCATOR = '[data-e2e-locator="submission-result"]'
export const TESTCASE_RESULT_LOCATOR = '[data-e2e-locator="testcase-result"]'

export interface ResultPanelMatch {
  panel: Element
  source: ResultSourcePanel
}

export function findResultPanels(expectedSource: ExtractionSource): ResultPanelMatch[] {
  const panels: ResultPanelMatch[] = []
  const seen = new Set<Element>()

  console.log("[PANEL CLASSIFICATION]")
  console.log("[EXPECTED SOURCE]", expectedSource)

  const addPanel = (panel: Element, source: ResultSourcePanel) => {
    if (seen.has(panel) || source === "unknown") {
      return
    }

    seen.add(panel)
    panels.push({ panel, source })
  }

  for (const tab of document.querySelectorAll(FLEXLAYOUT_TAB_SELECTOR)) {
    const classification = classifyResultPanel(tab)

    console.log("[PANEL CLASSIFICATION]")
    console.log("[DETECTED PANEL]", classification.panelType)
    console.log("[CLASSIFICATION REASON]", classification.reason)

    if (classification.panelType !== "unknown") {
      addPanel(tab, classification.panelType)
    }
  }

  if (panels.length === 0) {
    addPanelFromLocator(CONSOLE_RESULT_LOCATOR, "run", seen, panels, "fallback: console-result locator")
    addPanelFromLocator(TESTCASE_RESULT_LOCATOR, "run", seen, panels, "fallback: testcase-result locator")
    addPanelFromLocator(
      SUBMISSION_RESULT_LOCATOR,
      "submit",
      seen,
      panels,
      "fallback: submission-result locator"
    )
  }

  panels.sort((a, b) => {
    if (a.source === expectedSource && b.source !== expectedSource) {
      return -1
    }

    if (b.source === expectedSource && a.source !== expectedSource) {
      return 1
    }

    const aHasConsole = Boolean(a.panel.querySelector(CONSOLE_RESULT_LOCATOR))
    const bHasConsole = Boolean(b.panel.querySelector(CONSOLE_RESULT_LOCATOR))

    if (aHasConsole && !bHasConsole) {
      return -1
    }

    if (bHasConsole && !aHasConsole) {
      return 1
    }

    return 0
  })

  return panels
}

export function findResultContainers(): Element[] {
  const seen = new Set<Element>()
  const containers: Element[] = []

  for (const source of ["run", "submit"] as const) {
    for (const { panel } of findResultPanels(source)) {
      if (!seen.has(panel)) {
        seen.add(panel)
        containers.push(panel)
      }
    }
  }

  return containers
}

function classifyResultPanel(tab: Element): {
  panelType: ResultSourcePanel
  reason: string
} {
  const hasConsole = Boolean(tab.querySelector(CONSOLE_RESULT_LOCATOR))
  const hasTestcase = Boolean(tab.querySelector(TESTCASE_RESULT_LOCATOR))
  const hasSubmission = Boolean(tab.querySelector(SUBMISSION_RESULT_LOCATOR))

  if (hasConsole || hasTestcase) {
    return {
      panelType: "run",
      reason: `console-result=${hasConsole}, testcase-result=${hasTestcase}, submission-result=${hasSubmission}`
    }
  }

  if (hasSubmission) {
    return {
      panelType: "submit",
      reason: `submission-result=${hasSubmission}, console-result=${hasConsole}, testcase-result=${hasTestcase}`
    }
  }

  return {
    panelType: "unknown",
    reason: `no locators in tab (console=${hasConsole}, testcase=${hasTestcase}, submission=${hasSubmission})`
  }
}

function addPanelFromLocator(
  locator: string,
  source: ResultSourcePanel,
  seen: Set<Element>,
  panels: ResultPanelMatch[],
  reason: string
): void {
  const anchor = document.querySelector(locator)

  if (!anchor) {
    console.log("[PANEL CLASSIFICATION]")
    console.log("[DETECTED PANEL]", "unknown")
    console.log("[CLASSIFICATION REASON]", `${reason}: locator not found (${locator})`)
    return
  }

  const tab = anchor.closest(FLEXLAYOUT_TAB_SELECTOR)

  if (!tab || seen.has(tab)) {
    console.log("[PANEL CLASSIFICATION]")
    console.log("[DETECTED PANEL]", "unknown")
    console.log("[CLASSIFICATION REASON]", `${reason}: tab missing or duplicate (${locator})`)
    return
  }

  console.log("[PANEL CLASSIFICATION]")
  console.log("[DETECTED PANEL]", source)
  console.log("[CLASSIFICATION REASON]", reason)

  seen.add(tab)
  panels.push({ panel: tab, source })
}
