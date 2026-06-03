import { EDITOR_POLL_INTERVAL_MS, EDITOR_POLL_MAX_ATTEMPTS, EVENT_TYPES } from "~/constants"
import { rewriteDetectionService } from "~/services/rewrite-detection-service"
import { StorageService } from "~/services/storage-service"
import type { AttemptRecord, AttemptType } from "~/types/attempt"
import type { EventType, RegisterEventOptions, SessionEvent } from "~/types/events"
import type { RegisterSnapshotOptions, Snapshot, SnapshotTrigger } from "~/types/snapshot"
import type { ResultMetadata } from "~/types/results"
import type { Difficulty, Session, SessionJSON, SessionSummary } from "~/types/session"
import {
  extractEditorState,
  generateEventId,
  generateSessionId,
  generateSnapshotId,
  now,
  waitForEditorState
} from "~/utils"

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
      attemptHistory: []
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

    const snapshot: Snapshot = {
      snapshotId: generateSnapshotId(),
      timestamp: now(),
      trigger: options.trigger,
      code: options.code ?? editorState.code,
      language: options.language ?? editorState.language,
      questionSlug: this.currentSession.questionSlug
    }

    this.currentSession = {
      ...this.currentSession,
      snapshots: [...this.currentSession.snapshots, snapshot]
    }

    await this.persistActiveSession()

    rewriteDetectionService.evaluateSnapshot(snapshot)

    return snapshot
  }

  async recordAttempt(type: AttemptType, result: ResultMetadata): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== "active") {
      return
    }

    const record: AttemptRecord = {
      type,
      status: result.status,
      passed: result.passed,
      total: result.total,
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

    const completedSession: Session = {
      ...this.currentSession,
      endTime: now(),
      status: "completed"
    }

    this.currentSession = completedSession

    await StorageService.appendToHistory(completedSession)
    await StorageService.clearActiveSession()

    this.currentSession = null
    this.notifyListeners()

    return completedSession
  }

  exportSession(session: Session | null = this.currentSession): SessionJSON | null {
    if (!session) {
      return null
    }

    return structuredClone(normalizeSession(session))
  }

  exportSessionAsJson(session: Session | null = this.currentSession): string | null {
    const payload = this.exportSession(session)

    if (!payload) {
      return null
    }

    return JSON.stringify(payload, null, 2)
  }

  getSessionSummary(session: Session | null = this.currentSession): SessionSummary | null {
    if (!session) {
      return null
    }

    const normalized = normalizeSession(session)

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
    attemptHistory: session.attemptHistory ?? []
  }
}

export const sessionManager = SessionManager.getInstance()
