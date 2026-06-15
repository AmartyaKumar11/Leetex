import { EDITOR_POLL_INTERVAL_MS, EDITOR_POLL_MAX_ATTEMPTS, EVENT_TYPES } from "~/constants"
import { exportService } from "~/services/export-service"
import { behavioralSignalEngine } from "~/services/behavioral-signal-engine"
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
    if (this.currentSession?.status === "active") {
      if (this.currentSession.questionSlug === input.questionSlug) {
        return this.currentSession
      }

      await this.endSession()
    }

    const session: Session = {
      sessionId: generateSessionId(),
      questionTitle: input.questionTitle,
      questionSlug: input.questionSlug,
      difficulty: input.difficulty,
      startTime: now(),
      endTime: null,
      status: "active",
      events: [],
      snapshots: [],
      attemptHistory: [],
      metrics: createEmptySessionMetrics()
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
    if (!this.currentSession || this.currentSession.status !== "active") {
      return null
    }

    const event: SessionEvent = {
      eventId: generateEventId(),
      type,
      timestamp: now(),
      metadata: options.metadata
    }

    this.currentSession = {
      ...this.currentSession,
      events: [...this.currentSession.events, event]
    }

    await this.persistActiveSession()

    if (!options.skipSnapshot) {
      await this.registerSnapshot({ trigger: type as SnapshotTrigger })
    }

    return event
  }

  async registerSnapshot(options: RegisterSnapshotOptions): Promise<Snapshot | null> {
    if (!this.currentSession || this.currentSession.status !== "active") {
      return null
    }

    const editorState = extractEditorState()
    const code = options.code ?? editorState.code
    const language = options.language ?? editorState.language

    console.log("[SNAPSHOT CAPTURE]")
    console.log("[CODE LENGTH]", code.length)
    console.log("[LANGUAGE]", language)
    console.log("[SNAPSHOT TRIGGER]", options.trigger)
    console.log("[FIRST 200 CHARS]", code.slice(0, 200))
    console.log("[EDITOR SOURCE]", editorState.source)
    console.log("[MONACO AVAILABLE]", editorState.monacoAvailable)
    console.log("[MONACO EDITOR COUNT]", editorState.monacoEditorCount)

    const snapshotHash = await snapshotHashService.hashCode(code)

    const previous = this.currentSession.snapshots.at(-1)

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
      timestamp: now(),
      trigger: options.trigger,
      code,
      language,
      questionSlug: this.currentSession.questionSlug,
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
      ...this.currentSession,
      snapshots: [...this.currentSession.snapshots, snapshot]
    }

    await this.persistActiveSession()

    rewriteDetectionService.evaluateSnapshot(snapshot)

    return snapshot
  }

  async recordAttempt(type: AttemptType, result: ResultData): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== "active") {
      return
    }

    const record: AttemptRecord = {
      ...result,
      type,
      timestamp: now()
    }

    this.currentSession = {
      ...this.currentSession,
      attemptHistory: [...this.currentSession.attemptHistory, record]
    }

    await this.persistActiveSession()
  }

  async endSession(): Promise<Session | null> {
    if (!this.currentSession) {
      return null
    }

    snapshotSchedulerService.stop()

    const completedSession: Session = sessionMetricsService.attach({
      ...this.currentSession,
      endTime: now(),
      status: "completed"
    })

    this.currentSession = completedSession

    await StorageService.appendToHistory(completedSession)
    await StorageService.clearActiveSession()

    this.currentSession = null
    this.notifyListeners()

    return completedSession
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

  private async persistActiveSession(): Promise<void> {
    if (!this.currentSession) {
      return
    }

    this.currentSession = sessionMetricsService.attach(this.currentSession)
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
  return {
    ...session,
    attemptHistory: session.attemptHistory ?? [],
    metrics: session.metrics ?? createEmptySessionMetrics(),
    snapshots: (session.snapshots ?? []).map((snapshot) => ({
      ...snapshot,
      snapshotHash: snapshot.snapshotHash ?? "",
      similarityToPrevious: snapshot.similarityToPrevious ?? null
    }))
  }
}

export const sessionManager = SessionManager.getInstance()
