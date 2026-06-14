export { generateEventId, generateId, generateSessionId, generateSnapshotId, generateUuidV4 } from "~/utils/id"
export { formatDuration, formatElapsedSeconds, now, toISOString } from "~/utils/time"
export {
  buildSessionFilename,
  downloadJsonFile,
  serializeSession,
  serializeExportPayload,
  serializeExportToJson
} from "~/utils/session-export"
export { getBrowserLabel } from "~/utils/browser-info"
export { computeCodeSimilarity, isMajorRewrite } from "~/utils/code-similarity"
export { generateTimeline, formatTimelineLines } from "~/utils/timeline-generator"
export { formatTimelineForDisplay } from "~/utils/timeline-display"
export {
  generateBehaviorReport,
  formatBehaviorReport
} from "~/utils/behavior-report-generator"
export {
  extractResultDataFromDom,
  findResultContainers,
  RESULT_CONTAINER_SELECTORS
} from "~/utils/leetcode-result-extractor"
export {
  beginResultDiagnostics,
  endResultDiagnostics,
  evaluateAndLogRuleFailures,
  scanDiagnosticCandidates,
  setDiagnosticAttempt
} from "~/utils/result-extraction-diagnostics"
export type { DiagnosticCandidate, DiagnosticCategory } from "~/utils/result-extraction-diagnostics"
export {
  isResultDebugEnabled,
  resultDebugField,
  resultDebugLog,
  resultDebugWarn
} from "~/utils/result-extraction-debug"
export { hashCode, firstEditDebugLog } from "~/utils/code-hash"
export { calculateSimilarity, calculateSimilarityFromCode } from "~/utils/calculate-similarity"
export { isObserverDebugEnabled, observerDebugLog } from "~/utils/observer-debug"
export {
  extractDifficulty,
  extractEditorState,
  extractQuestionSlug,
  extractQuestionTitle,
  isEditorialTrigger,
  isEditorialUrl,
  isLeetCodeProblemUrl,
  isRunCodeButton,
  isSubmitButton,
  normalizeDifficulty,
  slugToTitle,
  waitForEditorState,
  waitForQuestionMetadata
} from "~/utils/leetcode-dom"
