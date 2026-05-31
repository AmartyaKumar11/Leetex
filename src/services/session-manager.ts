import { EVENT_TYPES } from "~/constants"
import { StorageService } from "~/services/storage-service"
import type { EventType, RegisterEventOptions, SessionEvent } from "~/types/events"
import type { RegisterSnapshotOptions, Snapshot, SnapshotTrigger } from "~/types/snapshot"
import type { Difficulty, Session, SessionJSON, SessionSummary } from "~/types/session"
import {
  extractEditorState,
  generateEventId,
  generateSessionId,
  generateSnapshotId,
  now
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

    this.currentSession = await StorageService.getActiveSession()
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
      snapshots: []
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

    await this.registerSnapshot({ trigger: "SESSION_START" })

    return session
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
      await this.registerSnapshot({ trigger: type })
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

    return snapshot
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

    return structuredClone(session)
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

    return {
      sessionId: session.sessionId,
      questionTitle: session.questionTitle,
      questionSlug: session.questionSlug,
      difficulty: session.difficulty,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      eventCount: session.events.length,
      snapshotCount: session.snapshots.length
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

export const sessionManager = SessionManager.getInstance()
