import type { ResponseValue } from '../api/types/response.js'
import type { InboundEvent } from './types/event.js'
import { Log, type LogLevel } from './log.js'
import type { AuthInfo } from './types/auth.js'
import { NullSession, type Session, type SessionFactory } from './types/session.js'

type ContextEvent = (context: Context) => Promise<void> | void

export interface ContextEvents {
  error: ContextEvent
}

/**
 * Context is the central component to all event and api handlers. We create a new context for
 * each endpoint or event invocation with a new database session which manages all database
 * interaction for the given event.
 *
 * Context is scoped per event and is designed to provide easy and consistent access to
 * entities that provide functionality that cuts across all handlers
 *
 * TPayload/TBody mirror the generic parameters on InboundEvent: a typed ApiHandler
 * declares them once and gets a typed payload and body-checked response builders.
 */
export class Context<TPayload = unknown, TBody extends ResponseValue = ResponseValue> {
  public event: InboundEvent<TPayload, TBody>
  public user: AuthInfo | undefined
  public authorised: boolean = false
  public props: Record<string, any> = {}
  public error?: unknown
  public log: Log

  private eventListeners: Record<string, ContextEvent[]> = {}
  private sessionFactory: SessionFactory
  private currentSession?: Session

  public constructor(event: InboundEvent<TPayload, TBody>,
    sessionFactory?: SessionFactory,
    logLevel: LogLevel = 'info') {
    this.log = new Log(logLevel)
    this.event = event
    this.sessionFactory = sessionFactory ?? (() => new NullSession())
  }

  /**
   * The database session for this context, created lazily on first access
   */
  public get session(): Session {
    if (!this.currentSession) this.currentSession = this.sessionFactory()

    return this.currentSession
  }

  public setEventSource(event: InboundEvent<TPayload, TBody>) {
    this.event = event
    return this
  }

  public setUser(user: AuthInfo) {
    this.user = user
  }

  /**
   * Register a listener for the specified session event
   * @param event
   * @param listener
   */
  public on<T extends keyof ContextEvents>(event: T, listener: ContextEvents[T]) {
    if (!Object.hasOwn(this.eventListeners, event)) {
      this.eventListeners[event] = []
    }

    this.eventListeners[event].push(listener)
  }

  /**
   * Raise an event and invoke event listeners asyncronously
   * @param event
   * @param arg
   * @returns
   */
  public async emit<T extends keyof ContextEvents>(event: T): Promise<void> {
    const events = this.eventListeners[event] || []

    for (const event_ of events) {
      try {
        await event_(this)
      } catch (error) {
        this.log.error(`Listener for "${event}" threw`, error)
      }
    }
  }
}
