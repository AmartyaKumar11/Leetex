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
export { extractRunOrSubmitResult } from "~/utils/leetcode-results"
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
