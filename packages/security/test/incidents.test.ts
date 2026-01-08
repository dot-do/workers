import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryIncidentTracker,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  createIncidentTracker,
  reportSecurityBreach,
  reportSystemOutage,
  reportDataLoss,
  reportComplianceViolation,
  type Incident,
  type IncidentMetadata,
} from '../src/incidents'

describe('InMemoryIncidentTracker', () => {
  let tracker: InMemoryIncidentTracker

  beforeEach(() => {
    tracker = new InMemoryIncidentTracker()
  })

  describe('report', () => {
    it('should create a new incident with generated ID', () => {
      const incident = tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Unauthorized access attempt',
        description: 'Multiple failed login attempts detected',
      })

      expect(incident.id).toBeDefined()
      expect(incident.id).toMatch(/^inc_\d+_\d+$/)
      expect(incident.category).toBe(IncidentCategory.SECURITY_BREACH)
      expect(incident.severity).toBe(IncidentSeverity.HIGH)
      expect(incident.status).toBe(IncidentStatus.OPEN)
      expect(incident.title).toBe('Unauthorized access attempt')
      expect(incident.reportedAt).toBeInstanceOf(Date)
    })

    it('should create incident with metadata', () => {
      const metadata: IncidentMetadata = {
        reporter: 'security-monitor',
        affectedSystems: ['api-gateway', 'auth-service'],
        sourceIp: '192.168.1.100',
        tags: ['security', 'authentication'],
      }

      const incident = tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'SQL injection attempt',
        description: 'Malicious SQL detected in user input',
        metadata,
      })

      expect(incident.metadata).toEqual(metadata)
      expect(incident.metadata?.affectedSystems).toHaveLength(2)
      expect(incident.metadata?.tags).toContain('security')
    })

    it('should create timeline entry on report', () => {
      const incident = tracker.report({
        category: IncidentCategory.DATA_LOSS,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.OPEN,
        title: 'Database backup failed',
        description: 'Automated backup process encountered an error',
        metadata: { reporter: 'backup-system' },
      })

      expect(incident.timeline).toHaveLength(1)
      expect(incident.timeline[0].action).toBe('created')
      expect(incident.timeline[0].description).toBe('Incident reported')
      expect(incident.timeline[0].statusAfter).toBe(IncidentStatus.OPEN)
      expect(incident.timeline[0].user).toBe('backup-system')
    })

    it('should generate unique IDs for multiple incidents', () => {
      const incident1 = tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Service down',
        description: 'API service is unavailable',
      })

      const incident2 = tracker.report({
        category: IncidentCategory.PERFORMANCE,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.OPEN,
        title: 'Slow response',
        description: 'API response times increased',
      })

      expect(incident1.id).not.toBe(incident2.id)
    })
  })

  describe('update', () => {
    it('should update incident properties', () => {
      const incident = tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Security incident',
        description: 'Initial description',
      })

      const updated = tracker.update(incident.id, {
        description: 'Updated description',
        metadata: { assignee: 'security-team' },
      })

      expect(updated).not.toBeNull()
      expect(updated?.description).toBe('Updated description')
      expect(updated?.metadata?.assignee).toBe('security-team')
      expect(updated?.timeline).toHaveLength(2)
    })

    it('should add timeline entry on update', () => {
      const incident = tracker.report({
        category: IncidentCategory.COMPLIANCE,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.OPEN,
        title: 'Compliance violation',
        description: 'Data retention policy violated',
      })

      const updated = tracker.update(
        incident.id,
        { rootCause: 'Misconfigured retention settings' },
        'compliance-officer'
      )

      expect(updated?.timeline).toHaveLength(2)
      expect(updated?.timeline[1].action).toBe('updated')
      expect(updated?.timeline[1].user).toBe('compliance-officer')
    })

    it('should set resolvedAt when status changes to RESOLVED', () => {
      const incident = tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.INVESTIGATING,
        title: 'Database outage',
        description: 'Primary database is unresponsive',
      })

      expect(incident.resolvedAt).toBeUndefined()

      const updated = tracker.update(incident.id, {
        status: IncidentStatus.RESOLVED,
        remediation: 'Restarted database service',
      })

      expect(updated?.resolvedAt).toBeInstanceOf(Date)
    })

    it('should set closedAt when status changes to CLOSED', () => {
      const incident = tracker.report({
        category: IncidentCategory.CONFIGURATION,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.RESOLVED,
        title: 'Config error',
        description: 'Invalid configuration detected',
      })

      const updated = tracker.update(incident.id, {
        status: IncidentStatus.CLOSED,
        lessonsLearned: 'Added validation checks',
      })

      expect(updated?.closedAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent incident', () => {
      const updated = tracker.update('non-existent-id', {
        description: 'Update',
      })

      expect(updated).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update incident status', () => {
      const incident = tracker.report({
        category: IncidentCategory.PRIVACY,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Privacy breach',
        description: 'Unauthorized data access',
      })

      const updated = tracker.updateStatus(
        incident.id,
        IncidentStatus.INVESTIGATING,
        'investigator',
        'Starting investigation'
      )

      expect(updated?.status).toBe(IncidentStatus.INVESTIGATING)
      expect(updated?.timeline).toHaveLength(2)
      expect(updated?.timeline[1].statusAfter).toBe(IncidentStatus.INVESTIGATING)
      expect(updated?.timeline[1].description).toBe('Starting investigation')
    })

    it('should use default description if not provided', () => {
      const incident = tracker.report({
        category: IncidentCategory.MALWARE,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'Malware detected',
        description: 'Malicious code found in upload',
      })

      const updated = tracker.updateStatus(incident.id, IncidentStatus.RESOLVING)

      expect(updated?.timeline[1].description).toBe('Status changed to resolving')
    })

    it('should set timestamps when status changes', () => {
      const incident = tracker.report({
        category: IncidentCategory.NETWORK_ATTACK,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.INVESTIGATING,
        title: 'DDoS attack',
        description: 'Distributed denial of service attack in progress',
      })

      const resolved = tracker.updateStatus(incident.id, IncidentStatus.RESOLVED)
      expect(resolved?.resolvedAt).toBeInstanceOf(Date)

      const closed = tracker.updateStatus(incident.id, IncidentStatus.CLOSED)
      expect(closed?.closedAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent incident', () => {
      const updated = tracker.updateStatus('invalid-id', IncidentStatus.CLOSED)
      expect(updated).toBeNull()
    })
  })

  describe('get', () => {
    it('should retrieve incident by ID', () => {
      const incident = tracker.report({
        category: IncidentCategory.OTHER,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.OPEN,
        title: 'Other incident',
        description: 'Miscellaneous incident',
      })

      const retrieved = tracker.get(incident.id)
      expect(retrieved).toEqual(incident)
    })

    it('should return null for non-existent ID', () => {
      const retrieved = tracker.get('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('query', () => {
    beforeEach(() => {
      // Create test data
      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'Critical breach',
        description: 'Unauthorized access',
        metadata: { assignee: 'team-a', tags: ['urgent'] },
      })

      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.INVESTIGATING,
        title: 'High severity breach',
        description: 'Suspicious activity',
        metadata: { assignee: 'team-b', tags: ['security'] },
      })

      tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.RESOLVED,
        title: 'Service outage',
        description: 'Temporary unavailability',
        metadata: { assignee: 'team-a' },
      })
    })

    it('should filter by category', () => {
      const results = tracker.query({
        category: IncidentCategory.SECURITY_BREACH,
      })

      expect(results).toHaveLength(2)
      results.forEach(incident => {
        expect(incident.category).toBe(IncidentCategory.SECURITY_BREACH)
      })
    })

    it('should filter by severity', () => {
      const results = tracker.query({
        severity: IncidentSeverity.CRITICAL,
      })

      expect(results).toHaveLength(1)
      expect(results[0].severity).toBe(IncidentSeverity.CRITICAL)
    })

    it('should filter by status', () => {
      const results = tracker.query({
        status: IncidentStatus.OPEN,
      })

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe(IncidentStatus.OPEN)
    })

    it('should filter by assignee', () => {
      const results = tracker.query({
        assignee: 'team-a',
      })

      expect(results).toHaveLength(2)
      results.forEach(incident => {
        expect(incident.metadata?.assignee).toBe('team-a')
      })
    })

    it('should filter by tags', () => {
      const results = tracker.query({
        tags: ['urgent'],
      })

      expect(results).toHaveLength(1)
      expect(results[0].metadata?.tags).toContain('urgent')
    })

    it('should filter by date range', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const results = tracker.query({
        dateFrom: yesterday,
        dateTo: tomorrow,
      })

      expect(results).toHaveLength(3)
    })

    it('should combine multiple filters', () => {
      const results = tracker.query({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
      })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Critical breach')
    })
  })

  describe('getters', () => {
    beforeEach(() => {
      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'Open critical',
        description: 'Open critical incident',
      })

      tracker.report({
        category: IncidentCategory.DATA_LOSS,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.CLOSED,
        title: 'Closed data loss',
        description: 'Closed incident',
      })

      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.RESOLVED,
        title: 'Resolved breach',
        description: 'Resolved incident',
      })
    })

    it('getAll should return all incidents', () => {
      const all = tracker.getAll()
      expect(all).toHaveLength(3)
    })

    it('getOpen should return only open incidents', () => {
      const open = tracker.getOpen()
      expect(open).toHaveLength(1)
      expect(open[0].status).toBe(IncidentStatus.OPEN)
    })

    it('getCritical should return only critical incidents', () => {
      const critical = tracker.getCritical()
      expect(critical).toHaveLength(1)
      expect(critical[0].severity).toBe(IncidentSeverity.CRITICAL)
    })

    it('getByCategory should return incidents of specific category', () => {
      const breaches = tracker.getByCategory(IncidentCategory.SECURITY_BREACH)
      expect(breaches).toHaveLength(2)
      breaches.forEach(incident => {
        expect(incident.category).toBe(IncidentCategory.SECURITY_BREACH)
      })
    })

    it('getBySeverity should return incidents of specific severity', () => {
      const high = tracker.getBySeverity(IncidentSeverity.HIGH)
      expect(high).toHaveLength(1)
      expect(high[0].severity).toBe(IncidentSeverity.HIGH)
    })

    it('getByStatus should return incidents of specific status', () => {
      const resolved = tracker.getByStatus(IncidentStatus.RESOLVED)
      expect(resolved).toHaveLength(1)
      expect(resolved[0].status).toBe(IncidentStatus.RESOLVED)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      // Create diverse set of incidents
      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'Open incident',
        description: 'Test',
      })

      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.INVESTIGATING,
        title: 'Investigating',
        description: 'Test',
      })

      tracker.report({
        category: IncidentCategory.DATA_LOSS,
        severity: IncidentSeverity.MEDIUM,
        status: IncidentStatus.RESOLVING,
        title: 'Resolving',
        description: 'Test',
      })

      const incident4 = tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.OPEN,
        title: 'To be resolved',
        description: 'Test',
      })

      // Resolve one incident
      tracker.updateStatus(incident4.id, IncidentStatus.RESOLVED)

      const stats = tracker.getStats()

      expect(stats.total).toBe(4)
      expect(stats.open).toBe(1)
      expect(stats.investigating).toBe(1)
      expect(stats.resolving).toBe(1)
      expect(stats.resolved).toBe(1)
      expect(stats.closed).toBe(0)

      expect(stats.bySeverity[IncidentSeverity.CRITICAL]).toBe(1)
      expect(stats.bySeverity[IncidentSeverity.HIGH]).toBe(1)
      expect(stats.bySeverity[IncidentSeverity.MEDIUM]).toBe(1)
      expect(stats.bySeverity[IncidentSeverity.LOW]).toBe(1)

      expect(stats.byCategory[IncidentCategory.SECURITY_BREACH]).toBe(2)
      expect(stats.byCategory[IncidentCategory.DATA_LOSS]).toBe(1)
      expect(stats.byCategory[IncidentCategory.SYSTEM_OUTAGE]).toBe(1)
    })

    it('should calculate average resolution time', () => {
      const incident1 = tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Outage 1',
        description: 'Test',
      })

      // Wait a tiny bit to ensure time difference
      const incident2 = tracker.report({
        category: IncidentCategory.SYSTEM_OUTAGE,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Outage 2',
        description: 'Test',
      })

      tracker.updateStatus(incident1.id, IncidentStatus.RESOLVED)
      tracker.updateStatus(incident2.id, IncidentStatus.RESOLVED)

      const stats = tracker.getStats()
      expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0)
    })

    it('should return stats for empty tracker', () => {
      const stats = tracker.getStats()

      expect(stats.total).toBe(0)
      expect(stats.open).toBe(0)
      expect(stats.averageResolutionTime).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should remove all incidents', () => {
      tracker.report({
        category: IncidentCategory.SECURITY_BREACH,
        severity: IncidentSeverity.CRITICAL,
        status: IncidentStatus.OPEN,
        title: 'Test',
        description: 'Test',
      })

      tracker.report({
        category: IncidentCategory.DATA_LOSS,
        severity: IncidentSeverity.HIGH,
        status: IncidentStatus.OPEN,
        title: 'Test',
        description: 'Test',
      })

      expect(tracker.getAll()).toHaveLength(2)

      tracker.clear()

      expect(tracker.getAll()).toHaveLength(0)
    })

    it('should reset ID counter', () => {
      tracker.report({
        category: IncidentCategory.OTHER,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.OPEN,
        title: 'Test',
        description: 'Test',
      })

      tracker.clear()

      const incident = tracker.report({
        category: IncidentCategory.OTHER,
        severity: IncidentSeverity.LOW,
        status: IncidentStatus.OPEN,
        title: 'Test',
        description: 'Test',
      })

      expect(incident.id).toMatch(/^inc_1_\d+$/)
    })
  })
})

describe('createIncidentTracker', () => {
  it('should create an InMemoryIncidentTracker instance', () => {
    const tracker = createIncidentTracker()
    expect(tracker).toBeInstanceOf(InMemoryIncidentTracker)
  })
})

describe('helper functions', () => {
  let tracker: InMemoryIncidentTracker

  beforeEach(() => {
    tracker = new InMemoryIncidentTracker()
  })

  describe('reportSecurityBreach', () => {
    it('should create a security breach incident', () => {
      const incident = reportSecurityBreach(
        tracker,
        'SQL injection attempt',
        'Malicious input detected',
        IncidentSeverity.CRITICAL,
        { sourceIp: '10.0.0.1' }
      )

      expect(incident.category).toBe(IncidentCategory.SECURITY_BREACH)
      expect(incident.severity).toBe(IncidentSeverity.CRITICAL)
      expect(incident.status).toBe(IncidentStatus.OPEN)
      expect(incident.title).toBe('SQL injection attempt')
      expect(incident.detectedAt).toBeInstanceOf(Date)
    })
  })

  describe('reportSystemOutage', () => {
    it('should create a system outage incident', () => {
      const incident = reportSystemOutage(
        tracker,
        'API service down',
        'Service unavailable',
        IncidentSeverity.HIGH,
        { affectedSystems: ['api-gateway'] }
      )

      expect(incident.category).toBe(IncidentCategory.SYSTEM_OUTAGE)
      expect(incident.severity).toBe(IncidentSeverity.HIGH)
      expect(incident.metadata?.affectedSystems).toContain('api-gateway')
    })
  })

  describe('reportDataLoss', () => {
    it('should create a data loss incident', () => {
      const incident = reportDataLoss(
        tracker,
        'Database corruption',
        'Data integrity compromised',
        IncidentSeverity.CRITICAL
      )

      expect(incident.category).toBe(IncidentCategory.DATA_LOSS)
      expect(incident.severity).toBe(IncidentSeverity.CRITICAL)
    })
  })

  describe('reportComplianceViolation', () => {
    it('should create a compliance violation incident', () => {
      const incident = reportComplianceViolation(
        tracker,
        'GDPR violation',
        'User data not properly anonymized',
        IncidentSeverity.HIGH,
        { tags: ['gdpr', 'privacy'] }
      )

      expect(incident.category).toBe(IncidentCategory.COMPLIANCE)
      expect(incident.metadata?.tags).toContain('gdpr')
    })
  })
})
