// @dotdo/security - Security Incident Management for SOC2/Compliance
// Provides incident collection, tracking, and reporting for security incidents

/**
 * Incident categories for SOC2/compliance tracking
 */
export enum IncidentCategory {
  /** Security breach or unauthorized access */
  SECURITY_BREACH = 'security_breach',
  /** Data loss or corruption */
  DATA_LOSS = 'data_loss',
  /** System outage or downtime */
  SYSTEM_OUTAGE = 'system_outage',
  /** Performance degradation */
  PERFORMANCE = 'performance',
  /** Compliance violation */
  COMPLIANCE = 'compliance',
  /** Privacy incident */
  PRIVACY = 'privacy',
  /** Malware or virus */
  MALWARE = 'malware',
  /** DDoS or network attack */
  NETWORK_ATTACK = 'network_attack',
  /** Configuration error */
  CONFIGURATION = 'configuration',
  /** Other incident type */
  OTHER = 'other',
}

/**
 * Incident severity levels
 */
export enum IncidentSeverity {
  /** Low impact - minimal business disruption */
  LOW = 'low',
  /** Medium impact - moderate business disruption */
  MEDIUM = 'medium',
  /** High impact - significant business disruption */
  HIGH = 'high',
  /** Critical impact - severe business disruption */
  CRITICAL = 'critical',
}

/**
 * Incident status lifecycle
 */
export enum IncidentStatus {
  /** Newly reported incident */
  OPEN = 'open',
  /** Under investigation */
  INVESTIGATING = 'investigating',
  /** Being actively resolved */
  RESOLVING = 'resolving',
  /** Resolved but awaiting verification */
  RESOLVED = 'resolved',
  /** Closed and verified */
  CLOSED = 'closed',
}

/**
 * Incident metadata for tracking and compliance
 */
export interface IncidentMetadata {
  /** User or system that reported the incident */
  reporter?: string
  /** User or team assigned to resolve */
  assignee?: string
  /** Affected systems or services */
  affectedSystems?: string[]
  /** Affected users or customers */
  affectedUsers?: string[]
  /** Geographic region affected */
  region?: string
  /** Source IP address if applicable */
  sourceIp?: string
  /** User agent if applicable */
  userAgent?: string
  /** Related incident IDs */
  relatedIncidents?: string[]
  /** Tags for categorization */
  tags?: string[]
  /** Additional context data */
  context?: Record<string, unknown>
}

/**
 * Incident timeline entry
 */
export interface IncidentTimelineEntry {
  /** Entry timestamp */
  timestamp: Date
  /** User who made the update */
  user?: string
  /** Action performed */
  action: string
  /** Description of the update */
  description: string
  /** Status after this update */
  statusAfter?: IncidentStatus
}

/**
 * Security incident record for SOC2/compliance
 */
export interface Incident {
  /** Unique incident ID */
  id: string
  /** Incident category */
  category: IncidentCategory
  /** Incident severity */
  severity: IncidentSeverity
  /** Current status */
  status: IncidentStatus
  /** Incident title */
  title: string
  /** Detailed description */
  description: string
  /** When the incident was reported */
  reportedAt: Date
  /** When the incident was detected */
  detectedAt?: Date
  /** When the incident was resolved */
  resolvedAt?: Date
  /** When the incident was closed */
  closedAt?: Date
  /** Incident metadata */
  metadata?: IncidentMetadata
  /** Timeline of updates */
  timeline: IncidentTimelineEntry[]
  /** Root cause analysis */
  rootCause?: string
  /** Remediation actions taken */
  remediation?: string
  /** Lessons learned */
  lessonsLearned?: string
}

/**
 * Incident query filters
 */
export interface IncidentQuery {
  category?: IncidentCategory
  severity?: IncidentSeverity
  status?: IncidentStatus
  assignee?: string
  dateFrom?: Date
  dateTo?: Date
  tags?: string[]
}

/**
 * Incident tracker interface for SOC2/compliance
 */
export interface IncidentTracker {
  /** Report a new incident */
  report(incident: Omit<Incident, 'id' | 'reportedAt' | 'timeline'>): Incident
  /** Update an existing incident */
  update(id: string, updates: Partial<Incident>, user?: string): Incident | null
  /** Update incident status */
  updateStatus(id: string, status: IncidentStatus, user?: string, description?: string): Incident | null
  /** Get incident by ID */
  get(id: string): Incident | null
  /** Query incidents with filters */
  query(filters: IncidentQuery): Incident[]
  /** Get all incidents */
  getAll(): Incident[]
  /** Get open incidents */
  getOpen(): Incident[]
  /** Get critical incidents */
  getCritical(): Incident[]
  /** Get incidents by category */
  getByCategory(category: IncidentCategory): Incident[]
  /** Get incidents by severity */
  getBySeverity(severity: IncidentSeverity): Incident[]
  /** Get incidents by status */
  getByStatus(status: IncidentStatus): Incident[]
  /** Get incident statistics */
  getStats(): IncidentStats
  /** Clear all incidents (for testing) */
  clear(): void
}

/**
 * Incident statistics for reporting
 */
export interface IncidentStats {
  total: number
  open: number
  investigating: number
  resolving: number
  resolved: number
  closed: number
  bySeverity: Record<IncidentSeverity, number>
  byCategory: Record<IncidentCategory, number>
  averageResolutionTime?: number
}

/**
 * In-memory incident tracker implementation
 */
export class InMemoryIncidentTracker implements IncidentTracker {
  private incidents: Map<string, Incident> = new Map()
  private idCounter = 0

  /**
   * Report a new incident
   */
  report(incident: Omit<Incident, 'id' | 'reportedAt' | 'timeline'>): Incident {
    const now = new Date()
    const newIncident: Incident = {
      ...incident,
      id: this.generateId(),
      reportedAt: now,
      timeline: [
        {
          timestamp: now,
          user: incident.metadata?.reporter,
          action: 'created',
          description: 'Incident reported',
          statusAfter: incident.status,
        },
      ],
    }

    this.incidents.set(newIncident.id, newIncident)
    return newIncident
  }

  /**
   * Update an existing incident
   */
  update(id: string, updates: Partial<Incident>, user?: string): Incident | null {
    const incident = this.incidents.get(id)
    if (!incident) {
      return null
    }

    const now = new Date()
    const updatedIncident: Incident = {
      ...incident,
      ...updates,
      timeline: [
        ...incident.timeline,
        {
          timestamp: now,
          user,
          action: 'updated',
          description: 'Incident updated',
          statusAfter: updates.status ?? incident.status,
        },
      ],
    }

    // Update resolved/closed timestamps based on status
    if (updates.status === IncidentStatus.RESOLVED && !incident.resolvedAt) {
      updatedIncident.resolvedAt = now
    }
    if (updates.status === IncidentStatus.CLOSED && !incident.closedAt) {
      updatedIncident.closedAt = now
    }

    this.incidents.set(id, updatedIncident)
    return updatedIncident
  }

  /**
   * Update incident status
   */
  updateStatus(
    id: string,
    status: IncidentStatus,
    user?: string,
    description?: string
  ): Incident | null {
    const incident = this.incidents.get(id)
    if (!incident) {
      return null
    }

    const now = new Date()
    const updatedIncident: Incident = {
      ...incident,
      status,
      timeline: [
        ...incident.timeline,
        {
          timestamp: now,
          user,
          action: 'status_changed',
          description: description ?? `Status changed to ${status}`,
          statusAfter: status,
        },
      ],
    }

    // Update resolved/closed timestamps
    if (status === IncidentStatus.RESOLVED && !incident.resolvedAt) {
      updatedIncident.resolvedAt = now
    }
    if (status === IncidentStatus.CLOSED && !incident.closedAt) {
      updatedIncident.closedAt = now
    }

    this.incidents.set(id, updatedIncident)
    return updatedIncident
  }

  /**
   * Get incident by ID
   */
  get(id: string): Incident | null {
    return this.incidents.get(id) ?? null
  }

  /**
   * Query incidents with filters
   */
  query(filters: IncidentQuery): Incident[] {
    let results = Array.from(this.incidents.values())

    if (filters.category) {
      results = results.filter(i => i.category === filters.category)
    }
    if (filters.severity) {
      results = results.filter(i => i.severity === filters.severity)
    }
    if (filters.status) {
      results = results.filter(i => i.status === filters.status)
    }
    if (filters.assignee) {
      results = results.filter(i => i.metadata?.assignee === filters.assignee)
    }
    if (filters.dateFrom) {
      results = results.filter(i => i.reportedAt >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      results = results.filter(i => i.reportedAt <= filters.dateTo!)
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(i =>
        filters.tags!.some(tag => i.metadata?.tags?.includes(tag))
      )
    }

    return results
  }

  /**
   * Get all incidents
   */
  getAll(): Incident[] {
    return Array.from(this.incidents.values())
  }

  /**
   * Get open incidents
   */
  getOpen(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.status === IncidentStatus.OPEN
    )
  }

  /**
   * Get critical incidents
   */
  getCritical(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.severity === IncidentSeverity.CRITICAL
    )
  }

  /**
   * Get incidents by category
   */
  getByCategory(category: IncidentCategory): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.category === category
    )
  }

  /**
   * Get incidents by severity
   */
  getBySeverity(severity: IncidentSeverity): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.severity === severity
    )
  }

  /**
   * Get incidents by status
   */
  getByStatus(status: IncidentStatus): Incident[] {
    return Array.from(this.incidents.values()).filter(
      i => i.status === status
    )
  }

  /**
   * Get incident statistics
   */
  getStats(): IncidentStats {
    const incidents = Array.from(this.incidents.values())

    const stats: IncidentStats = {
      total: incidents.length,
      open: 0,
      investigating: 0,
      resolving: 0,
      resolved: 0,
      closed: 0,
      bySeverity: {
        [IncidentSeverity.LOW]: 0,
        [IncidentSeverity.MEDIUM]: 0,
        [IncidentSeverity.HIGH]: 0,
        [IncidentSeverity.CRITICAL]: 0,
      },
      byCategory: {
        [IncidentCategory.SECURITY_BREACH]: 0,
        [IncidentCategory.DATA_LOSS]: 0,
        [IncidentCategory.SYSTEM_OUTAGE]: 0,
        [IncidentCategory.PERFORMANCE]: 0,
        [IncidentCategory.COMPLIANCE]: 0,
        [IncidentCategory.PRIVACY]: 0,
        [IncidentCategory.MALWARE]: 0,
        [IncidentCategory.NETWORK_ATTACK]: 0,
        [IncidentCategory.CONFIGURATION]: 0,
        [IncidentCategory.OTHER]: 0,
      },
    }

    // Count by status
    incidents.forEach(incident => {
      switch (incident.status) {
        case IncidentStatus.OPEN:
          stats.open++
          break
        case IncidentStatus.INVESTIGATING:
          stats.investigating++
          break
        case IncidentStatus.RESOLVING:
          stats.resolving++
          break
        case IncidentStatus.RESOLVED:
          stats.resolved++
          break
        case IncidentStatus.CLOSED:
          stats.closed++
          break
      }

      // Count by severity
      stats.bySeverity[incident.severity]++

      // Count by category
      stats.byCategory[incident.category]++
    })

    // Calculate average resolution time
    const resolvedIncidents = incidents.filter(
      i => i.resolvedAt && i.reportedAt
    )
    if (resolvedIncidents.length > 0) {
      const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
        const resolutionTime = incident.resolvedAt!.getTime() - incident.reportedAt.getTime()
        return sum + resolutionTime
      }, 0)
      stats.averageResolutionTime = totalResolutionTime / resolvedIncidents.length
    }

    return stats
  }

  /**
   * Clear all incidents (for testing)
   */
  clear(): void {
    this.incidents.clear()
    this.idCounter = 0
  }

  /**
   * Generate a unique incident ID
   */
  private generateId(): string {
    return `inc_${++this.idCounter}_${Date.now()}`
  }
}

/**
 * Create a default incident tracker
 */
export function createIncidentTracker(): IncidentTracker {
  return new InMemoryIncidentTracker()
}

/**
 * Helper functions for common incident operations
 */

/**
 * Report a security breach incident
 */
export function reportSecurityBreach(
  tracker: IncidentTracker,
  title: string,
  description: string,
  severity: IncidentSeverity,
  metadata?: IncidentMetadata
): Incident {
  return tracker.report({
    category: IncidentCategory.SECURITY_BREACH,
    severity,
    status: IncidentStatus.OPEN,
    title,
    description,
    metadata,
    detectedAt: new Date(),
  })
}

/**
 * Report a system outage incident
 */
export function reportSystemOutage(
  tracker: IncidentTracker,
  title: string,
  description: string,
  severity: IncidentSeverity,
  metadata?: IncidentMetadata
): Incident {
  return tracker.report({
    category: IncidentCategory.SYSTEM_OUTAGE,
    severity,
    status: IncidentStatus.OPEN,
    title,
    description,
    metadata,
    detectedAt: new Date(),
  })
}

/**
 * Report a data loss incident
 */
export function reportDataLoss(
  tracker: IncidentTracker,
  title: string,
  description: string,
  severity: IncidentSeverity,
  metadata?: IncidentMetadata
): Incident {
  return tracker.report({
    category: IncidentCategory.DATA_LOSS,
    severity,
    status: IncidentStatus.OPEN,
    title,
    description,
    metadata,
    detectedAt: new Date(),
  })
}

/**
 * Report a compliance violation incident
 */
export function reportComplianceViolation(
  tracker: IncidentTracker,
  title: string,
  description: string,
  severity: IncidentSeverity,
  metadata?: IncidentMetadata
): Incident {
  return tracker.report({
    category: IncidentCategory.COMPLIANCE,
    severity,
    status: IncidentStatus.OPEN,
    title,
    description,
    metadata,
    detectedAt: new Date(),
  })
}
