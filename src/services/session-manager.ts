import { EDITOR_POLL_INTERVAL_MS, EDITOR_POLL_MAX_ATTEMPTS, EVENT_TYPES, SESSION_TIMEOUT_MS } from "~/constants"
import { exportService } from "~/services/export-service"
import { behavioralSignalEngine } from "~/services/behavioral-signal-engine"
import { learningSourceTrackingService } from "~/services/learning-source-tracking-service"
import { rewriteDetectionService } from "~/services/rewrite-detection-service"
import {
  createEmptySessionMetrics,
  sessionMetricsService
} from "~/services/session-metrics-service"
import { snapshotHashService } from "~/services/snapshot-hash-service"
import { snapshotSchedulerService } from "~/services/snapshot-scheduler-service"
import { StorageService } from "~/services/storage-service"
import type { AttemptRecord, AttemptType } from "~/types/attempt"
import type { EventType, RegisterEventOptions, SessionEvent } from "~/types/events"
import type { RegisterSnapshotOptions, Snapshot, SnapshotTrigger } from "~/types/snapshot"
import type { ResultData } from "~/types/results"
import type { SessionExportPayload } from "~/types/export"
import type { SessionAnalysis } from "~/types/session-analysis"
import type { Difficulty, Session, SessionJSON, SessionSummary } from "~/types/session"
import { createEmptyLearningSources } from "~/types/learning-source"
import { withAggregatedLearningSources } from "~/utils/learning-source-aggregation"
import { calculateSimilarityFromCode } from "~/utils/calculate-similarity"
import {
  extractEditorState,
  generateEventId,
  generateSessionId,
  generateSnapshotId,
  now,
  waitForEditorState
} from "~/utils"
import { observerDebugLog } from "~/utils/observer-debug"
import { isSessionTimedOut, resolveLastActivityTimestamp } from "~/utils/session-time"

export type SessionChangeListener = (session: Session | null) => void

export class SessionManager {
  private static instance: SessionManager | null = null

  private currentSession: Session | null = null
  private listeners = new Set<SessionChangeListener>()
  private initialized = false

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }

    return SessionManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    const stored = await StorageService.getActiveSession()
    this.currentSession = stored ? normalizeSession(stored) : null
    this.initialized = true
    this.notifyListeners()
  }

  subscribe(listener: SessionChangeListener): () => void {
    this.listeners.add(listener)
    listener(this.currentSession)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getCurrentSession(): Session | null {
    return this.currentSession
  }

  hasEvent(type: EventType): boolean {
    return this.currentSession?.events.some((event) => event.type === type) ?? false
  }

  async createSession(input: {
    questionTitle: string
    questionSlug: string
    difficulty: Difficulty | null
  }): Promise<Session> {
    const activityTimestamp = now()

    if (this.currentSession?.status === "active") {
      if (this.currentSession.questionSlug === input.questionSlug) {
        const lastActivity = resolveLastActivityTimestamp(this.currentSession)

        if (!isSessionTimedOut(lastActivity, activityTimestamp, SESSION_TIMEOUT_MS)) {
          return this.currentSession
        }

        await this.endSession(lastActivity)
      } else {
        await this.endSession()
      }
    }

    const sessionStart = now()

    const session: Session = {
      sessionId: generateSessionId(),
      questionTitle: input.questionTitle,
      questionSlug: input.questionSlug,
      difficulty: input.difficulty,
      startTime: sessionStart,
      endTime: null,
      lastActivityTimestamp: sessionStart,
      status: "active",
      isReturningSession: false,
      events: [],
      snapshots: [],
      attemptHistory: [],
      metrics: createEmptySessionMetrics(),
      learningSources: createEmptyLearningSources(),
      learningSourceVisits: []
    }

    this.currentSession = session
    await this.persistActiveSession()

    await this.registerEvent(EVENT_TYPES.QUESTION_OPENED, {
      metadata: {
        questionTitle: input.questionTitle,
        questionSlug: input.questionSlug,
        difficulty: input.difficulty
      },
      skipSnapshot: true
    })

    return session
  }

  async captureInitialSnapshot(): Promise<Snapshot | null> {
    const editorState = await waitForEditorState(
      EDITOR_POLL_MAX_ATTEMPTS,
      EDITOR_POLL_INTERVAL_MS
    )

    return this.registerSnapshot({
      trigger: "SESSION_START",
      code: editorState.code,
      language: editorState.language
    })
  }

  async registerEventOnce(
    type: EventType,
    options: RegisterEventOptions = {}
  ): Promise<SessionEvent | null> {
    if (this.hasEvent(type)) {
      return null
    }

    return this.registerEvent(type, options)
  }

  async registerEvent(
    type: EventType,
    options: RegisterEventOptions = {}
  ): Promise<SessionEvent | null> {
    const activityTimestamp = now()

    if (!(await this.ensureActiveSessionForActivity(activityTimestamp))) {
      return null
    }

    const event: SessionEvent = {
      eventId: generateEventId(),
      type,
      timestamp: activityTimestamp,
      metadata: options.metadata
    }

    this.currentSession = {
      ...this.currentSession!,
      events: [...this.currentSession!.events, event],
      lastActivityTimestamp: activityTimestamp
    }

    await this.persistActiveSession()

    if (!options.skipSnapshot) {
      await this.registerSnapshot({ trigger: type as SnapshotTrigger })
    }

    return event
  }

  async registerSnapshot(options: RegisterSnapshotOptions): Promise<Snapshot | null> {
    const activityTimestamp = now()

    if (!(await this.ensureActiveSessionForActivity(activityTimestamp))) {
      return null
    }

    const session = this.currentSession!

    const editorState = extractEditorState()
    const code = options.code ?? editorState.code
    const language = options.language ?? editorState.language
    const snapshotHash = await snapshotHashService.hashCode(code)

    const previous = session.snapshots.at(-1)

    if (previous && previous.snapshotHash === snapshotHash) {
      observerDebugLog("Snapshot Skipped (duplicate hash)", {
        trigger: options.trigger,
        snapshotHash
      })
      return null
    }

    const similarityToPrevious = previous
      ? calculateSimilarityFromCode(previous.code, code)
      : null

    observerDebugLog("Hash Generated", { snapshotHash, trigger: options.trigger })

    if (similarityToPrevious !== null) {
      observerDebugLog("Similarity Calculated", {
        similarityToPrevious,
        trigger: options.trigger
      })
    }

    const snapshot: Snapshot = {
      snapshotId: generateSnapshotId(),
      timestamp: activityTimestamp,
      trigger: options.trigger,
      code,
      language,
      questionSlug: session.questionSlug,
      snapshotHash,
      similarityToPrevious
    }

    observerDebugLog("Snapshot Created", {
      snapshotId: snapshot.snapshotId,
      trigger: snapshot.trigger,
      snapshotHash,
      similarityToPrevious
    })

    this.currentSession = {
      ...this.currentSession!,
      snapshots: [...this.currentSession!.snapshots, snapshot],
      lastActivityTimestamp: activityTimestamp
    }

    await this.persistActiveSession()

    rewriteDetectionService.evaluateSnapshot(snapshot)

    return snapshot
  }

  async recordAttempt(type: AttemptType, result: ResultData): Promise<void> {
    const activityTimestamp = now()

    if (!(await this.ensureActiveSessionForActivity(activityTimestamp))) {
      return
    }

    const record: AttemptRecord = {
      ...result,
      type,
      timestamp: activityTimestamp
    }

    this.currentSession = {
      ...this.currentSession!,
      attemptHistory: [...this.currentSession!.attemptHistory, record],
      lastActivityTimestamp: activityTimestamp
    }

    await this.persistActiveSession()
  }

  async endSession(endTime?: number): Promise<Session | null> {
    if (!this.currentSession) {
      return null
    }

    await learningSourceTrackingService.closeOnSessionEnd()
    snapshotSchedulerService.stop()

    const resolvedEndTime = endTime ?? now()

    const completedSession: Session = sessionMetricsService.attach({
      ...this.currentSession,
      endTime: resolvedEndTime,
      lastActivityTimestamp: Math.max(
        resolveLastActivityTimestamp(this.currentSession),
        resolvedEndTime
      ),
      status: "completed"
    })

    this.currentSession = completedSession

    await StorageService.appendToHistory(completedSession)
    await StorageService.clearActiveSession()

    this.currentSession = null
    this.notifyListeners()

    return completedSession
  }

  async markAsReturningSession(): Promise<void> {
    if (!this.currentSession) {
      return
    }

    this.currentSession = {
      ...this.currentSession,
      isReturningSession: true
    }

    await this.persistActiveSession()
    observerDebugLog("Session marked as returning session")
  }

  analyzeSession(session: Session | null = this.currentSession): SessionAnalysis | null {
    if (!session) {
      return null
    }

    return behavioralSignalEngine.analyze(normalizeSession(session))
  }

  exportSession(session: Session | null = this.currentSession): SessionJSON | null {
    if (!session) {
      return null
    }

    return structuredClone(sessionMetricsService.attach(normalizeSession(session)))
  }

  async exportSessionPayload(
    session: Session | null = this.currentSession
  ): Promise<SessionExportPayload | null> {
    if (!session) {
      return null
    }

    return exportService.buildExportPayload(normalizeSession(session))
  }

  async exportSessionAsJson(
    session: Session | null = this.currentSession
  ): Promise<string | null> {
    const outcome = await exportService.exportSession(session)

    if (!outcome.success) {
      return null
    }

    return outcome.json
  }

  getSessionSummary(session: Session | null = this.currentSession): SessionSummary | null {
    if (!session) {
      return null
    }

    const normalized = sessionMetricsService.attach(normalizeSession(session))

    return {
      sessionId: normalized.sessionId,
      questionTitle: normalized.questionTitle,
      questionSlug: normalized.questionSlug,
      difficulty: normalized.difficulty,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      status: normalized.status,
      eventCount: normalized.events.length,
      snapshotCount: normalized.snapshots.length,
      attemptCount: normalized.attemptHistory.length
    }
  }

  private async ensureActiveSessionForActivity(activityTimestamp: number): Promise<boolean> {
    const session = this.currentSession

    if (!session || session.status !== "active") {
      return false
    }

    const lastActivity = resolveLastActivityTimestamp(session)

    if (!isSessionTimedOut(lastActivity, activityTimestamp, SESSION_TIMEOUT_MS)) {
      return true
    }

    const { questionTitle, questionSlug, difficulty } = session

    observerDebugLog("Session timed out — starting new session", {
      sessionId: session.sessionId,
      questionSlug,
      lastActivity,
      activityTimestamp,
      gapMs: activityTimestamp - lastActivity
    })

    await this.endSession(lastActivity)
    await this.createSession({ questionTitle, questionSlug, difficulty })

    return this.currentSession?.status === "active"
  }

  private async persistActiveSession(): Promise<void> {
    if (!this.currentSession) {
      return
    }

    this.currentSession = withAggregatedLearningSources(
      sessionMetricsService.attach(this.currentSession)
    )
    await StorageService.saveActiveSession(this.currentSession)
    this.notifyListeners()
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentSession)
    }
  }
}

function normalizeSession(session: Session): Session {
  const lastActivityTimestamp = resolveLastActivityTimestamp(session)

  return withAggregatedLearningSources({
    ...session,
    isReturningSession: session.isReturningSession ?? false,
    lastActivityTimestamp,
    attemptHistory: session.attemptHistory ?? [],
    metrics: session.metrics ?? createEmptySessionMetrics(),
    snapshots: (session.snapshots ?? []).map((snapshot) => ({
      ...snapshot,
      snapshotHash: snapshot.snapshotHash ?? "",
      similarityToPrevious: snapshot.similarityToPrevious ?? null
    }))
  })
}

export const sessionManager = SessionManager.getInstance()
