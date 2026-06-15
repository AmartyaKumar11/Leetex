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

  const addPanel = (panel: Element, source: ResultSourcePanel) => {
    if (seen.has(panel) || source === "unknown") {
      return
    }

    seen.add(panel)
    panels.push({ panel, source })
  }

  for (const tab of document.querySelectorAll(FLEXLAYOUT_TAB_SELECTOR)) {
    if (tab.querySelector(CONSOLE_RESULT_LOCATOR) || tab.querySelector(TESTCASE_RESULT_LOCATOR)) {
      addPanel(tab, "run")
      continue
    }

    if (tab.querySelector(SUBMISSION_RESULT_LOCATOR)) {
      addPanel(tab, "submit")
    }
  }

  if (panels.length === 0) {
    addPanelFromLocator(CONSOLE_RESULT_LOCATOR, "run", seen, panels)
    addPanelFromLocator(TESTCASE_RESULT_LOCATOR, "run", seen, panels)
    addPanelFromLocator(SUBMISSION_RESULT_LOCATOR, "submit", seen, panels)
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

function addPanelFromLocator(
  locator: string,
  source: ResultSourcePanel,
  seen: Set<Element>,
  panels: ResultPanelMatch[]
): void {
  const anchor = document.querySelector(locator)

  if (!anchor) {
    return
  }

  const tab = anchor.closest(FLEXLAYOUT_TAB_SELECTOR)

  if (!tab || seen.has(tab)) {
    return
  }

  seen.add(tab)
  panels.push({ panel: tab, source })
}
