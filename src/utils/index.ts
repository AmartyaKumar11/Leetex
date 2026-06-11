export { generateEventId, generateId, generateSessionId, generateSnapshotId } from "~/utils/id"
export { formatDuration, now, toISOString } from "~/utils/time"
export {
  buildSessionFilename,
  downloadJsonFile,
  serializeSession,
  serializeSessionToJson
} from "~/utils/session-export"
export { computeCodeSimilarity, isMajorRewrite } from "~/utils/code-similarity"
export { generateTimeline, formatTimelineLines } from "~/utils/timeline-generator"
export {
  generateBehaviorReport,
  formatBehaviorReport
} from "~/utils/behavior-report-generator"
export {
  extractResultDataFromDom,
  findResultContainers,
  RESULT_CONTAINER_SELECTORS
} from "~/utils/leetcode-result-extractor"
export { isResultDebugEnabled, resultDebugLog } from "~/utils/result-extraction-debug"
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
