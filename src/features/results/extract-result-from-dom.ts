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
    } else if (detectedPanel === "unknown") {
      detectedPanel = source
    }
  }

  if (merged.status === "Unknown" && !hasAnyExtractedField(merged)) {
    return null
  }

  merged.sourcePanel = validateSourcePanel(detectedPanel, expectedSource)
  merged.confidence = calculateResultConfidence(merged)

  logExtractionSummary(merged, expectedSource, merged.sourcePanel ?? "unknown")

  return merged
}

function validateSourcePanel(
  detected: ResultSourcePanel,
  expected: ExtractionSource
): ResultSourcePanel {
  if (detected === "unknown") {
    return "unknown"
  }

  return detected === expected ? expected : "unknown"
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
