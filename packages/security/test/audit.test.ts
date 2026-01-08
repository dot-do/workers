import { describe, it, expect, beforeEach } from 'vitest'
import {
  SecurityEventType,
  SecurityEventSeverity,
  InMemorySecurityEventLogger,
  createSecurityEventLogger,
  logAuthEvent,
  logAccessEvent,
  logViolationEvent,
  type SecurityEvent,
  type SecurityEventMetadata,
} from '../src/audit'

describe('Security Event Logging', () => {
  let logger: InMemorySecurityEventLogger

  beforeEach(() => {
    logger = new InMemorySecurityEventLogger()
  })

  describe('InMemorySecurityEventLogger', () => {
    it('should log a security event', () => {
      const event = logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'User logged in',
        success: true,
      })

      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.type).toBe(SecurityEventType.AUTH)
      expect(event.severity).toBe(SecurityEventSeverity.INFO)
      expect(event.message).toBe('User logged in')
      expect(event.success).toBe(true)
    })

    it('should generate unique event IDs', () => {
      const event1 = logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 1',
        success: true,
      })

      const event2 = logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 2',
        success: true,
      })

      expect(event1.id).not.toBe(event2.id)
    })

    it('should log event with metadata', () => {
      const metadata: SecurityEventMetadata = {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        resource: '/api/users',
        action: 'read',
        context: { role: 'admin' },
      }

      const event = logger.log({
        type: SecurityEventType.ACCESS,
        severity: SecurityEventSeverity.INFO,
        message: 'Resource accessed',
        success: true,
        metadata,
      })

      expect(event.metadata).toEqual(metadata)
      expect(event.metadata?.userId).toBe('user123')
      expect(event.metadata?.ipAddress).toBe('192.168.1.1')
      expect(event.metadata?.resource).toBe('/api/users')
    })

    it('should get events by type', () => {
      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Login',
        success: true,
      })

      logger.log({
        type: SecurityEventType.ACCESS,
        severity: SecurityEventSeverity.INFO,
        message: 'Access',
        success: true,
      })

      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Logout',
        success: true,
      })

      const authEvents = logger.getEventsByType(SecurityEventType.AUTH)
      const accessEvents = logger.getEventsByType(SecurityEventType.ACCESS)

      expect(authEvents).toHaveLength(2)
      expect(accessEvents).toHaveLength(1)
      expect(authEvents[0].message).toBe('Login')
      expect(authEvents[1].message).toBe('Logout')
    })

    it('should get events by severity', () => {
      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Info event',
        success: true,
      })

      logger.log({
        type: SecurityEventType.VIOLATION,
        severity: SecurityEventSeverity.CRITICAL,
        message: 'Critical event',
        success: false,
      })

      logger.log({
        type: SecurityEventType.ACCESS,
        severity: SecurityEventSeverity.WARNING,
        message: 'Warning event',
        success: false,
      })

      const infoEvents = logger.getEventsBySeverity(SecurityEventSeverity.INFO)
      const criticalEvents = logger.getEventsBySeverity(SecurityEventSeverity.CRITICAL)
      const warningEvents = logger.getEventsBySeverity(SecurityEventSeverity.WARNING)

      expect(infoEvents).toHaveLength(1)
      expect(criticalEvents).toHaveLength(1)
      expect(warningEvents).toHaveLength(1)
      expect(criticalEvents[0].message).toBe('Critical event')
    })

    it('should get recent events with limit', () => {
      for (let i = 0; i < 15; i++) {
        logger.log({
          type: SecurityEventType.AUTH,
          severity: SecurityEventSeverity.INFO,
          message: `Event ${i}`,
          success: true,
        })
      }

      const recent5 = logger.getRecentEvents(5)
      const recent10 = logger.getRecentEvents(10)
      const recentDefault = logger.getRecentEvents()

      expect(recent5).toHaveLength(5)
      expect(recent10).toHaveLength(10)
      expect(recentDefault).toHaveLength(10) // Default is 10
      expect(recent5[4].message).toBe('Event 14') // Last event
    })

    it('should get all events', () => {
      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 1',
        success: true,
      })

      logger.log({
        type: SecurityEventType.ACCESS,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 2',
        success: true,
      })

      const allEvents = logger.getAllEvents()
      expect(allEvents).toHaveLength(2)
    })

    it('should clear all events', () => {
      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 1',
        success: true,
      })

      logger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Event 2',
        success: true,
      })

      expect(logger.getAllEvents()).toHaveLength(2)

      logger.clear()

      expect(logger.getAllEvents()).toHaveLength(0)
    })

    it('should handle empty event list', () => {
      expect(logger.getAllEvents()).toHaveLength(0)
      expect(logger.getRecentEvents()).toHaveLength(0)
      expect(logger.getEventsByType(SecurityEventType.AUTH)).toHaveLength(0)
    })
  })

  describe('Helper Functions', () => {
    describe('logAuthEvent', () => {
      it('should log successful authentication event', () => {
        const event = logAuthEvent(logger, 'User logged in successfully', true, {
          userId: 'user123',
          ipAddress: '192.168.1.1',
        })

        expect(event.type).toBe(SecurityEventType.AUTH)
        expect(event.severity).toBe(SecurityEventSeverity.INFO)
        expect(event.message).toBe('User logged in successfully')
        expect(event.success).toBe(true)
        expect(event.metadata?.userId).toBe('user123')
      })

      it('should log failed authentication event', () => {
        const event = logAuthEvent(
          logger,
          'Invalid credentials',
          false,
          { userId: 'user123' },
          SecurityEventSeverity.WARNING
        )

        expect(event.type).toBe(SecurityEventType.AUTH)
        expect(event.severity).toBe(SecurityEventSeverity.WARNING)
        expect(event.success).toBe(false)
      })

      it('should default to INFO severity', () => {
        const event = logAuthEvent(logger, 'Token refreshed', true)

        expect(event.severity).toBe(SecurityEventSeverity.INFO)
      })
    })

    describe('logAccessEvent', () => {
      it('should log successful access event', () => {
        const event = logAccessEvent(logger, 'Resource accessed', true, {
          userId: 'user123',
          resource: '/api/users',
          action: 'read',
        })

        expect(event.type).toBe(SecurityEventType.ACCESS)
        expect(event.severity).toBe(SecurityEventSeverity.INFO)
        expect(event.message).toBe('Resource accessed')
        expect(event.success).toBe(true)
        expect(event.metadata?.resource).toBe('/api/users')
        expect(event.metadata?.action).toBe('read')
      })

      it('should log failed access event', () => {
        const event = logAccessEvent(
          logger,
          'Access denied',
          false,
          { userId: 'user123', resource: '/admin' },
          SecurityEventSeverity.WARNING
        )

        expect(event.type).toBe(SecurityEventType.ACCESS)
        expect(event.severity).toBe(SecurityEventSeverity.WARNING)
        expect(event.success).toBe(false)
      })

      it('should default to INFO severity', () => {
        const event = logAccessEvent(logger, 'Permission checked', true)

        expect(event.severity).toBe(SecurityEventSeverity.INFO)
      })
    })

    describe('logViolationEvent', () => {
      it('should log security violation event', () => {
        const event = logViolationEvent(logger, 'SQL injection attempt detected', {
          userId: 'user123',
          ipAddress: '192.168.1.1',
          resource: '/api/search',
          context: { input: "' OR '1'='1" },
        })

        expect(event.type).toBe(SecurityEventType.VIOLATION)
        expect(event.severity).toBe(SecurityEventSeverity.CRITICAL)
        expect(event.message).toBe('SQL injection attempt detected')
        expect(event.success).toBe(false)
        expect(event.metadata?.context?.input).toBe("' OR '1'='1")
      })

      it('should default to CRITICAL severity', () => {
        const event = logViolationEvent(logger, 'Unauthorized access attempt')

        expect(event.severity).toBe(SecurityEventSeverity.CRITICAL)
        expect(event.success).toBe(false)
      })

      it('should allow custom severity', () => {
        const event = logViolationEvent(
          logger,
          'Minor violation',
          undefined,
          SecurityEventSeverity.WARNING
        )

        expect(event.severity).toBe(SecurityEventSeverity.WARNING)
      })
    })
  })

  describe('createSecurityEventLogger', () => {
    it('should create a new logger instance', () => {
      const logger1 = createSecurityEventLogger()
      const logger2 = createSecurityEventLogger()

      expect(logger1).toBeDefined()
      expect(logger2).toBeDefined()
      expect(logger1).not.toBe(logger2)
    })

    it('should create a functioning logger', () => {
      const newLogger = createSecurityEventLogger()

      const event = newLogger.log({
        type: SecurityEventType.AUTH,
        severity: SecurityEventSeverity.INFO,
        message: 'Test event',
        success: true,
      })

      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
    })
  })

  describe('Real-world scenarios', () => {
    it('should track a complete authentication flow', () => {
      // Login attempt
      logAuthEvent(logger, 'Login attempt', true, {
        userId: 'user123',
        ipAddress: '192.168.1.1',
      })

      // Token refresh
      logAuthEvent(logger, 'Token refreshed', true, {
        userId: 'user123',
      })

      // Logout
      logAuthEvent(logger, 'User logged out', true, {
        userId: 'user123',
      })

      const authEvents = logger.getEventsByType(SecurityEventType.AUTH)
      expect(authEvents).toHaveLength(3)
      expect(authEvents.every(e => e.success)).toBe(true)
    })

    it('should track access control violations', () => {
      // Successful access
      logAccessEvent(logger, 'Read user profile', true, {
        userId: 'user123',
        resource: '/api/users/123',
        action: 'read',
      })

      // Denied access
      logAccessEvent(
        logger,
        'Access denied to admin panel',
        false,
        {
          userId: 'user123',
          resource: '/admin',
          action: 'read',
        },
        SecurityEventSeverity.WARNING
      )

      const accessEvents = logger.getEventsByType(SecurityEventType.ACCESS)
      expect(accessEvents).toHaveLength(2)
      expect(accessEvents[0].success).toBe(true)
      expect(accessEvents[1].success).toBe(false)
    })

    it('should track security violations', () => {
      // SQL injection attempt
      logViolationEvent(logger, 'SQL injection detected', {
        ipAddress: '192.168.1.100',
        resource: '/api/search',
        context: { input: "' OR '1'='1" },
      })

      // XSS attempt
      logViolationEvent(logger, 'XSS attempt detected', {
        ipAddress: '192.168.1.100',
        resource: '/api/comments',
        context: { input: '<script>alert(1)</script>' },
      })

      const violations = logger.getEventsByType(SecurityEventType.VIOLATION)
      const critical = logger.getEventsBySeverity(SecurityEventSeverity.CRITICAL)

      expect(violations).toHaveLength(2)
      expect(critical).toHaveLength(2)
      expect(violations.every(e => !e.success)).toBe(true)
    })

    it('should filter events by multiple criteria', () => {
      logAuthEvent(logger, 'Login success', true)
      logAuthEvent(logger, 'Login failed', false, undefined, SecurityEventSeverity.WARNING)
      logAccessEvent(logger, 'Access granted', true)
      logViolationEvent(logger, 'Attack detected')

      const authEvents = logger.getEventsByType(SecurityEventType.AUTH)
      const warningEvents = logger.getEventsBySeverity(SecurityEventSeverity.WARNING)
      const criticalEvents = logger.getEventsBySeverity(SecurityEventSeverity.CRITICAL)

      expect(authEvents).toHaveLength(2)
      expect(warningEvents).toHaveLength(1)
      expect(criticalEvents).toHaveLength(1)
    })
  })
})
