import {
  calculateResultConfidence,
  createEmptyResultData,
  mergeResultData,
  type ResultData,
  type ResultSourcePanel
} from "~/types/results"
import {
  findResultPanels,
  type ExtractionSource
} from "~/features/results/panel-discovery"
import { extractPanelModel, normalizePanelModel } from "~/features/results/panel-model"
import { isResultDebugEnabled, resultDebugLog } from "~/utils/result-extraction-debug"
import { logStatusDetected, scanDiagnosticCandidates } from "~/utils/result-extraction-diagnostics"

export function extractResultDataFromDom(
  expectedSource: ExtractionSource
): ResultData | null {
  const panels = findResultPanels(expectedSource)

  if (panels.length === 0) {
    if (isResultDebugEnabled()) {
      console.info("[LeetEx Result Panel]", {
        panelFound: false,
        panelLength: 0,
        status: null,
        errorPreview: null
      })
    }
    return null
  }

  let merged = createEmptyResultData("Unknown")
  let detectedPanel: ResultSourcePanel = "unknown"
  let classificationReason = "no panels matched expected source"

  for (const { panel, source } of panels) {
    scanDiagnosticCandidates(panel)

    const model = extractPanelModel(panel)
    const normalized = normalizePanelModel(model)

    if (model.status) {
      logStatusDetected(normalized.status, panel)
    }

    merged = mergeResultData(merged, {
      ...normalized,
      sourcePanel: source
    })

    if (source === expectedSource) {
      detectedPanel = source
      classificationReason = `panel matched expected source (${expectedSource})`
    } else if (detectedPanel === "unknown") {
      detectedPanel = source
      classificationReason = `fallback to first panel (${source}); expected ${expectedSource}`
    }
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    return null
  }

  const validatedPanel = validateSourcePanel(detectedPanel, expectedSource, classificationReason)
  merged.sourcePanel = validatedPanel
  merged.confidence = calculateResultConfidence(merged)

  console.log("[RUNTIME SOURCE]", merged.runtime)
  console.log("[SOURCE PANEL]", merged.sourcePanel)

  if (merged.status === "Accepted") {
    console.log(
      "[EXTRACTION COMPLETE TRIGGER]",
      Boolean(merged.runtime) || Boolean(merged.memory)
        ? `early-complete: runtime=${merged.runtime ?? "null"}, memory=${merged.memory ?? "null"}`
        : "not complete yet"
    )
  }

  logExtractionSummary(merged, expectedSource, merged.sourcePanel ?? "unknown")

  return merged
}

function validateSourcePanel(
  detected: ResultSourcePanel,
  expected: ExtractionSource,
  reason: string
): ResultSourcePanel {
  console.log("[PANEL CLASSIFICATION]")
  console.log("[EXPECTED SOURCE]", expected)
  console.log("[DETECTED PANEL]", detected)
  console.log("[CLASSIFICATION REASON]", reason)

  if (detected === "unknown") {
    console.log("[CLASSIFICATION REASON]", "final: detected panel is unknown")
    return "unknown"
  }

  if (detected !== expected) {
    console.log(
      "[CLASSIFICATION REASON]",
      `final: detected (${detected}) !== expected (${expected}) → unknown`
    )
    return "unknown"
  }

  console.log("[CLASSIFICATION REASON]", `final: detected matches expected (${expected})`)
  return expected
}

function hasAnyExtractedField(result: ResultData): boolean {
  return (
    result.passed != null ||
    result.total != null ||
    result.runtime != null ||
    result.memory != null ||
    result.failedInput != null ||
    result.actualOutput != null ||
    result.expectedOutput != null ||
    result.errorText != null ||
    result.errorCategory != null
  )
}

function logExtractionSummary(
  result: ResultData,
  expectedSource: ExtractionSource,
  sourcePanel: ResultSourcePanel
): void {
  resultDebugLog("Extraction summary", {
    expectedSource,
    sourcePanel,
    confidence: result.confidence,
    status: result.status,
    passed: result.passed,
    total: result.total,
    failedInput: Boolean(result.failedInput),
    actualOutput: Boolean(result.actualOutput),
    expectedOutput: Boolean(result.expectedOutput),
    errorText: Boolean(result.errorText),
    errorCategory: result.errorCategory,
    runtime: result.runtime,
    memory: result.memory
  })
}
