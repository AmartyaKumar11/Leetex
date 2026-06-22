/**
 * Fixture-based analytics validation harness.
 *
 * Usage:
 *   npm run analytics:test fixtures/two-sum.json
 *   npm run analytics:test fixtures/
 *   npm run analytics:test fixtures/ --write
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve } from "node:path"

import { SessionAnalyticsEngine } from "../src/analytics/session-analytics-engine"
import { EVENT_TYPES } from "../src/types/events"
import { createEmptyLearningSources } from "../src/types/learning-source"
import { createEmptySessionMetrics } from "../src/types/metrics"
import type { ResultStatus } from "../src/types/results"
import type { SessionAnalysis } from "../src/types/session-analysis-export"
import { SessionClassification } from "../src/types/session-analysis-export"
import type { Session } from "../src/types/session"
import { withAggregatedLearningSources } from "../src/utils/learning-source-aggregation"
import { resolveLastActivityTimestamp } from "../src/utils/session-time"

const REWRITE_HEAVY_THRESHOLD = 2

interface FileAnalysisResult {
  filePath: string
  analysis: SessionAnalysis
  finalStatus: string | null
  detected: string[]
  flags: SessionFlags
}

interface SessionFlags {
  accepted: boolean
  runtimeError: boolean
  wrongAnswer: boolean
  editorialUsed: boolean
  solutionUsed: boolean
  discussionUsed: boolean
  rewriteHeavy: boolean
}

interface AggregateStats {
  totalFiles: number
  acceptedSessions: number
  runtimeErrorSessions: number
  wrongAnswerSessions: number
  editorialSessions: number
  solutionSessions: number
  discussionSessions: number
  totalRuns: number
  totalSubmissions: number
}

function main(): void {
  const args = process.argv.slice(2)
  const writeAnalysis = args.includes("--write")
  const targetArg = args.find((arg) => !arg.startsWith("--"))

  if (!targetArg) {
    console.error("Usage: npm run analytics:test <file.json | directory/> [--write]")
    process.exit(1)
  }

  const targetPath = resolve(process.cwd(), targetArg)
  const files = collectJsonFiles(targetPath)

  if (files.length === 0) {
    console.error(`No JSON files found at: ${targetPath}`)
    process.exit(1)
  }

  const engine = new SessionAnalyticsEngine()
  const results: FileAnalysisResult[] = []

  for (const filePath of files) {
    try {
      const result = analyzeFile(engine, filePath)

      if (writeAnalysis) {
        writeAnalysisArtifact(filePath, result.analysis)
      }

      results.push(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`\nFAILED: ${relative(process.cwd(), filePath)}`)
      console.error(`  ${message}`)
      process.exitCode = 1
    }
  }

  for (const result of results) {
    printFileReport(result)
  }

  if (files.length > 1) {
    printAggregateReport(results)
    validatePhaseExpectations(results)
  }
}

function collectJsonFiles(targetPath: string): string[] {
  const stats = statSync(targetPath)

  if (stats.isFile()) {
    if (extname(targetPath).toLowerCase() !== ".json") {
      throw new Error("Target must be a .json file or directory")
    }

    return [targetPath]
  }

  if (!stats.isDirectory()) {
    throw new Error("Target must be a .json file or directory")
  }

  return findJsonFilesRecursive(targetPath).sort()
}

function findJsonFilesRecursive(directory: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...findJsonFilesRecursive(fullPath))
      continue
    }

    if (entry.isFile() && extname(entry.name).toLowerCase() === ".json") {
      if (entry.name.endsWith("-analysis.json")) {
        continue
      }

      files.push(fullPath)
    }
  }

  return files
}

function analyzeFile(engine: SessionAnalyticsEngine, filePath: string): FileAnalysisResult {
  const raw = readFileSync(filePath, "utf8")
  const parsed = parseExportedJson(raw)
  const session = extractSession(parsed)
  const analysis = engine.analyze(session)
  const embeddedAnalysis = extractEmbeddedAnalysis(parsed)

  if (embeddedAnalysis) {
    validateEmbeddedAnalysis(embeddedAnalysis, analysis, filePath)
  }

  const finalStatus = analysis.summary.finalStatus
  const flags = detectSessionFlags(analysis, session)
  const detected = buildDetectedLabels(flags)

  return {
    filePath,
    analysis,
    finalStatus,
    detected,
    flags
  }
}

function parseExportedJson(rawJson: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(rawJson)

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON root")
  }

  return parsed as Record<string, unknown>
}

function extractSession(record: Record<string, unknown>): Session {
  if (record.session && typeof record.session === "object") {
    return normalizeExportSession(record.session as Session)
  }

  if (typeof record.sessionId === "string" && Array.isArray(record.events)) {
    return normalizeExportSession(record as Session)
  }

  throw new Error("Unrecognized export format — expected { session } or raw Session JSON")
}

function extractEmbeddedAnalysis(record: Record<string, unknown>): SessionAnalysis | null {
  if (!record.analysis || typeof record.analysis !== "object") {
    return null
  }

  return record.analysis as SessionAnalysis
}

function validateEmbeddedAnalysis(
  embedded: SessionAnalysis,
  computed: SessionAnalysis,
  filePath: string
): void {
  const embeddedComparable = normalizeAnalysisForComparison(embedded)
  const computedComparable = normalizeAnalysisForComparison(computed)

  if (JSON.stringify(embeddedComparable) !== JSON.stringify(computedComparable)) {
    throw new Error(
      `Embedded analysis does not match engine output in ${relative(process.cwd(), filePath)}`
    )
  }

  console.log(`Embedded analysis matches engine: ${relative(process.cwd(), filePath)}`)
}

function normalizeAnalysisForComparison(analysis: SessionAnalysis): Omit<SessionAnalysis, "generatedAt"> {
  const { generatedAt: _generatedAt, ...rest } = analysis
  return rest
}

function writeAnalysisArtifact(fixturePath: string, analysis: SessionAnalysis): void {
  const outputPath = resolveAnalysisOutputPath(fixturePath)

  writeFileSync(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8")
  console.log(`Wrote analysis artifact: ${relative(process.cwd(), outputPath)}`)
}

function resolveAnalysisOutputPath(fixturePath: string): string {
  const directory = dirname(fixturePath)
  const filename = basename(fixturePath, extname(fixturePath))

  return join(directory, `${filename}-analysis.json`)
}

function normalizeExportSession(raw: Session): Session {
  const session: Session = {
    ...raw,
    events: raw.events ?? [],
    snapshots: (raw.snapshots ?? []).map((snapshot) => ({
      ...snapshot,
      snapshotHash: snapshot.snapshotHash ?? "",
      similarityToPrevious: snapshot.similarityToPrevious ?? null
    })),
    attemptHistory: raw.attemptHistory ?? [],
    metrics: raw.metrics ?? createEmptySessionMetrics(),
    learningSources: raw.learningSources ?? createEmptyLearningSources(),
    learningSourceVisits: raw.learningSourceVisits ?? [],
    lastActivityTimestamp:
      raw.lastActivityTimestamp ??
      resolveLastActivityTimestamp({
        ...raw,
        events: raw.events ?? [],
        attemptHistory: raw.attemptHistory ?? [],
        snapshots: raw.snapshots ?? [],
        learningSourceVisits: raw.learningSourceVisits ?? []
      })
  }

  return withAggregatedLearningSources(session)
}

function detectSessionFlags(analysis: SessionAnalysis, session: Session): SessionFlags {
  const { behavioralFeatures: features } = analysis
  const statuses = collectResultStatuses(session)

  return {
    accepted: statuses.has("Accepted"),
    runtimeError:
      features.debugging.runtimeErrors > 0 || statuses.has("Runtime Error"),
    wrongAnswer: features.debugging.wrongAnswers > 0 || statuses.has("Wrong Answer"),
    editorialUsed: features.learning.editorialVisits > 0,
    solutionUsed: features.learning.solutionVisits > 0,
    discussionUsed: features.learning.discussionVisits > 0,
    rewriteHeavy: features.rewrites.majorRewrites > REWRITE_HEAVY_THRESHOLD
  }
}

function collectResultStatuses(session: Session): Set<ResultStatus> {
  const statuses = new Set<ResultStatus>()

  for (const attempt of session.attemptHistory ?? []) {
    statuses.add(attempt.status)
  }

  for (const event of session.events ?? []) {
    if (
      event.type === EVENT_TYPES.RUN_RESULT ||
      event.type === EVENT_TYPES.SUBMISSION_RESULT
    ) {
      const status = readStatus(event.metadata)

      if (status) {
        statuses.add(status)
      }
    }
  }

  return statuses
}

function buildDetectedLabels(flags: SessionFlags): string[] {
  const labels: string[] = []

  if (flags.accepted) labels.push("Accepted")
  if (flags.runtimeError) labels.push("Runtime Error")
  if (flags.wrongAnswer) labels.push("Wrong Answer")
  if (flags.editorialUsed) labels.push("Editorial Used")
  if (flags.solutionUsed) labels.push("Solution Used")
  if (flags.discussionUsed) labels.push("Discussion Used")
  if (flags.rewriteHeavy) labels.push("Rewrite Heavy")

  return labels
}

function printFileReport(result: FileAnalysisResult): void {
  const { analysis, finalStatus, detected } = result
  const { behavioralFeatures: features } = analysis
  const fileLabel = relative(process.cwd(), result.filePath)

  console.log("")
  console.log("=".repeat(72))
  console.log(`FILE: ${fileLabel}`)
  console.log("=".repeat(72))
  console.log("")
  console.log(`Question Title: ${analysis.summary.questionTitle}`)
  console.log(`Question Slug:  ${analysis.summary.questionSlug}`)
  console.log(`Final Status:   ${finalStatus ?? "Unknown"}`)
  console.log("")
  console.log(`Runs:              ${features.solving.totalRuns}`)
  console.log(`Submissions:       ${features.solving.totalSubmissions}`)
  console.log("")
  console.log(`Compile Errors:    ${features.debugging.compileErrors}`)
  console.log(`Runtime Errors:    ${features.debugging.runtimeErrors}`)
  console.log(`Wrong Answers:     ${features.debugging.wrongAnswers}`)
  console.log("")
  console.log(`Editorial Visits:  ${features.learning.editorialVisits}`)
  console.log(`Solution Visits:   ${features.learning.solutionVisits}`)
  console.log(`Discussion Visits: ${features.learning.discussionVisits}`)
  console.log("")
  console.log(`Major Rewrites:    ${features.rewrites.majorRewrites}`)
  console.log(`Replay Entries:    ${analysis.timeline.length}`)
  console.log("")
  console.log("REPLAY PREVIEW")
  console.log("")

  const preview = analysis.timeline.slice(0, 10)

  if (preview.length === 0) {
    console.log("(no replay entries)")
  } else {
    for (const entry of preview) {
      console.log(`${formatReplayTime(entry.relativeTimeMs)} ${entry.event}`)
    }

    if (analysis.timeline.length > preview.length) {
      console.log("...")
    }
  }

  console.log("")
  console.log("CLASSIFICATIONS")

  if (analysis.classifications.length === 0) {
    console.log("  (none)")
  } else {
    for (const label of analysis.classifications) {
      console.log(`  ${label}`)
    }
  }

  const { snapshotAnalytics } = analysis

  console.log("")
  console.log("SNAPSHOT ANALYTICS")
  console.log("")
  console.log(`Snapshot Count:       ${snapshotAnalytics.snapshotCount}`)
  console.log(`Average Similarity:   ${snapshotAnalytics.averageSimilarity}`)
  console.log(`Minimum Similarity:   ${snapshotAnalytics.minimumSimilarity}`)
  console.log(`Maximum Similarity:   ${snapshotAnalytics.maximumSimilarity}`)
  console.log(`Major Rewrite Count:  ${snapshotAnalytics.majorRewriteCount}`)
  console.log(`Average Code Length:  ${snapshotAnalytics.averageCodeLength}`)
  console.log("")
  console.log("Detected:")

  if (detected.length === 0) {
    console.log("  (none)")
  } else {
    for (const label of detected) {
      console.log(`  ✓ ${label}`)
    }
  }
}

function printAggregateReport(results: FileAnalysisResult[]): void {
  const stats = summarizeAggregate(results)

  console.log("")
  console.log("=".repeat(72))
  console.log("TOTAL FILES ANALYZED")
  console.log("=".repeat(72))
  console.log("")
  console.log(`Files:                 ${stats.totalFiles}`)
  console.log(`Accepted Sessions:     ${stats.acceptedSessions}`)
  console.log(`Runtime Error Sessions: ${stats.runtimeErrorSessions}`)
  console.log(`Wrong Answer Sessions: ${stats.wrongAnswerSessions}`)
  console.log(`Editorial Sessions:    ${stats.editorialSessions}`)
  console.log(`Solution Sessions:     ${stats.solutionSessions}`)
  console.log(`Discussion Sessions:   ${stats.discussionSessions}`)
  console.log("")
  console.log(`Average Runs:          ${formatAverage(stats.totalRuns, stats.totalFiles)}`)
  console.log(`Average Submissions:   ${formatAverage(stats.totalSubmissions, stats.totalFiles)}`)
}

function summarizeAggregate(results: FileAnalysisResult[]): AggregateStats {
  const stats: AggregateStats = {
    totalFiles: results.length,
    acceptedSessions: 0,
    runtimeErrorSessions: 0,
    wrongAnswerSessions: 0,
    editorialSessions: 0,
    solutionSessions: 0,
    discussionSessions: 0,
    totalRuns: 0,
    totalSubmissions: 0
  }

  for (const result of results) {
    const { flags, analysis } = result
    const { behavioralFeatures: features } = analysis

    if (flags.accepted) stats.acceptedSessions += 1
    if (flags.runtimeError) stats.runtimeErrorSessions += 1
    if (flags.wrongAnswer) stats.wrongAnswerSessions += 1
    if (flags.editorialUsed) stats.editorialSessions += 1
    if (flags.solutionUsed) stats.solutionSessions += 1
    if (flags.discussionUsed) stats.discussionSessions += 1

    stats.totalRuns += features.solving.totalRuns
    stats.totalSubmissions += features.solving.totalSubmissions
  }

  return stats
}

function validatePhaseExpectations(results: FileAnalysisResult[]): void {
  const allClassifications = new Set(
    results.flatMap((result) => result.analysis.classifications)
  )

  const checks: Array<[string, boolean]> = [
    [
      "EDITORIAL_ASSISTED present",
      allClassifications.has(SessionClassification.EDITORIAL_ASSISTED)
    ],
    [
      "SOLUTION_ASSISTED present",
      allClassifications.has(SessionClassification.SOLUTION_ASSISTED)
    ],
    [
      "SELF_SOLVED present",
      allClassifications.has(SessionClassification.SELF_SOLVED)
    ],
    [
      "DEBUG_HEAVY present (if thresholds met in fixtures)",
      allClassifications.has(SessionClassification.DEBUG_HEAVY)
    ]
  ]

  const hasSnapshotData = results.some(
    (result) => result.analysis.snapshotAnalytics.snapshotCount > 0
  )

  const hasRealSimilarity = results.some(
    (result) => result.analysis.snapshotAnalytics.averageSimilarity > 0
  )

  checks.push(["Fixture set includes snapshots", hasSnapshotData])
  checks.push(["Snapshot similarity computed", hasRealSimilarity])

  console.log("")
  console.log("=".repeat(72))
  console.log("PHASE 4.3 VALIDATION")
  console.log("=".repeat(72))
  console.log("")

  const failed = checks.filter(([, ok]) => !ok)

  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`)
  }

  if (failed.length > 0) {
    console.error("")
    console.error("Phase 4.3 validation FAILED")
    process.exitCode = 1
  } else {
    console.log("")
    console.log("Phase 4.3 validation PASSED")
  }
}

function formatReplayTime(relativeTimeMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, relativeTimeMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatAverage(total: number, count: number): string {
  if (count === 0) {
    return "0.0"
  }

  return (total / count).toFixed(1)
}

function readStatus(metadata?: Record<string, unknown>): ResultStatus | null {
  const value = metadata?.status

  if (typeof value === "string") {
    return value as ResultStatus
  }

  return null
}

main()
