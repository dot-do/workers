// @dotdo/security - Security Event Logging and Audit Trail
// Provides security event logging for authentication, access control, and violations

/**
 * Security event types
 */
export enum SecurityEventType {
  /** Authentication events (login, logout, token refresh) */
  AUTH = 'auth',
  /** Access control events (resource access, permission checks) */
  ACCESS = 'access',
  /** Security violations (injection attempts, unauthorized access) */
  VIOLATION = 'violation',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Security event metadata
 */
export interface SecurityEventMetadata {
  /** User ID or identifier */
  userId?: string
  /** IP address of the client */
  ipAddress?: string
  /** User agent string */
  userAgent?: string
  /** Resource being accessed */
  resource?: string
  /** Action performed */
  action?: string
  /** Additional context data */
  context?: Record<string, unknown>
}

/**
 * Security event record
 */
export interface SecurityEvent {
  /** Unique event ID */
  id: string
  /** Event type */
  type: SecurityEventType
  /** Event severity */
  severity: SecurityEventSeverity
  /** Event timestamp */
  timestamp: Date
  /** Event message */
  message: string
  /** Event metadata */
  metadata?: SecurityEventMetadata
  /** Whether the event was successful */
  success: boolean
}

/**
 * Security event logger interface
 */
export interface SecurityEventLogger {
  /** Log a security event */
  log(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent
  /** Get events by type */
  getEventsByType(type: SecurityEventType): SecurityEvent[]
  /** Get events by severity */
  getEventsBySeverity(severity: SecurityEventSeverity): SecurityEvent[]
  /** Get recent events */
  getRecentEvents(limit?: number): SecurityEvent[]
  /** Clear all events */
  clear(): void
}

/**
 * In-memory security event logger implementation
 */
export class InMemorySecurityEventLogger implements SecurityEventLogger {
  private events: SecurityEvent[] = []
  private idCounter = 0

  /**
   * Log a security event
   */
  log(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    }

    this.events.push(securityEvent)
    return securityEvent
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(event => event.type === type)
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecurityEventSeverity): SecurityEvent[] {
    return this.events.filter(event => event.severity === severity)
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 10): SecurityEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Get all events
   */
  getAllEvents(): SecurityEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
    this.idCounter = 0
  }

  /**
   * Generate a unique event ID
   */
  private generateId(): string {
    return `evt_${++this.idCounter}_${Date.now()}`
  }
}

/**
 * Helper functions for logging specific event types
 */

/**
 * Log an authentication event
 */
export function logAuthEvent(
  logger: SecurityEventLogger,
  message: string,
  success: boolean,
  metadata?: SecurityEventMetadata,
  severity: SecurityEventSeverity = SecurityEventSeverity.INFO
): SecurityEvent {
  return logger.log({
    type: SecurityEventType.AUTH,
    severity,
    message,
    success,
    metadata,
  })
}

/**
 * Log an access control event
 */
export function logAccessEvent(
  logger: SecurityEventLogger,
  message: string,
  success: boolean,
  metadata?: SecurityEventMetadata,
  severity: SecurityEventSeverity = SecurityEventSeverity.INFO
): SecurityEvent {
  return logger.log({
    type: SecurityEventType.ACCESS,
    severity,
    message,
    success,
    metadata,
  })
}

/**
 * Log a security violation event
 */
export function logViolationEvent(
  logger: SecurityEventLogger,
  message: string,
  metadata?: SecurityEventMetadata,
  severity: SecurityEventSeverity = SecurityEventSeverity.CRITICAL
): SecurityEvent {
  return logger.log({
    type: SecurityEventType.VIOLATION,
    severity,
    message,
    success: false,
    metadata,
  })
}

/**
 * Create a default security event logger
 */
export function createSecurityEventLogger(): SecurityEventLogger {
  return new InMemorySecurityEventLogger()
}
