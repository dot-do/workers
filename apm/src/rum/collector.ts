import type { Env, RUMEvent } from '../types'

/**
 * RUM Event Collector
 * Receives RUM events from browser SDK and writes to Analytics Engine
 */
export class RUMCollector {
  constructor(private env: Env) {}

  async ingestEvents(applicationId: string, events: RUMEvent[]): Promise<void> {
    for (const event of events) {
      await this.writeEvent(applicationId, event)
    }
  }

  private async writeEvent(applicationId: string, event: RUMEvent): Promise<void> {
    const { type, timestamp, sessionId, viewId, url, data } = event

    // Common blobs for all event types
    const commonBlobs = [
      applicationId,
      type,
      sessionId,
      viewId,
      url,
      event.userAgent,
      event.deviceType,
      event.country || '',
      event.region || '',
      event.city || '',
    ]

    // Type-specific data
    let doubles: number[] = []
    let blobs: string[] = [...commonBlobs]

    switch (type) {
      case 'pageview':
        doubles = [data.loadTime, data.domContentLoadedTime, data.firstPaintTime || 0, data.firstContentfulPaintTime || 0]
        blobs.push(data.title)
        break

      case 'webvital':
        doubles = [data.value]
        blobs.push(data.name, data.rating)
        break

      case 'interaction':
        doubles = [data.duration]
        blobs.push(data.elementType, data.elementId || '', data.elementText || '')
        break

      case 'error':
        doubles = [0]
        blobs.push(data.message, data.stack || '', data.errorType, data.filename || '')
        break

      case 'resource':
        doubles = [data.duration, data.size || 0, data.status || 0]
        blobs.push(data.url, data.type)
        break

      case 'longtask':
        doubles = [data.duration, data.startTime]
        blobs.push(JSON.stringify(data.attribution || []))
        break
    }

    // Write to Analytics Engine
    this.env.RUM.writeDataPoint({
      blobs,
      doubles,
      indexes: [applicationId, type, event.deviceType],
    })

    // Store critical events in D1 for fast querying
    if (type === 'error' || (type === 'webvital' && data.rating === 'poor')) {
      await this.storeInD1(applicationId, event)
    }
  }

  private async storeInD1(applicationId: string, event: RUMEvent): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO rum_critical_events (
        application_id, event_type, session_id, view_id, url, timestamp,
        message, severity, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        applicationId,
        event.type,
        event.sessionId,
        event.viewId,
        event.url,
        Math.floor(event.timestamp / 1000),
        this.getEventMessage(event),
        this.getEventSeverity(event),
        JSON.stringify(event.data)
      )
      .run()
  }

  private getEventMessage(event: RUMEvent): string {
    switch (event.type) {
      case 'error':
        return event.data.message
      case 'webvital':
        return `${event.data.name}: ${event.data.value.toFixed(2)}ms (${event.data.rating})`
      default:
        return event.type
    }
  }

  private getEventSeverity(event: RUMEvent): 'info' | 'warning' | 'critical' {
    if (event.type === 'error') return 'critical'
    if (event.type === 'webvital' && event.data.rating === 'poor') return 'warning'
    return 'info'
  }

  /**
   * Get RUM dashboard data
   */
  async getDashboardData(applicationId: string, from: number, to: number) {
    // This would query Analytics Engine for aggregated metrics
    // For now, return structure
    return {
      pageViews: 0,
      uniqueSessions: 0,
      avgLoadTime: 0,
      errorRate: 0,
      webVitals: {
        lcp: { p50: 0, p75: 0, p95: 0, p99: 0 },
        fid: { p50: 0, p75: 0, p95: 0, p99: 0 },
        cls: { p50: 0, p75: 0, p95: 0, p99: 0 },
      },
      topPages: [],
      topErrors: [],
      deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
      geographicDistribution: {},
    }
  }

  /**
   * Get session replay data
   */
  async getSessionReplay(sessionId: string): Promise<RUMEvent[]> {
    // Query Analytics Engine for all events in session
    // Return chronologically ordered events
    return []
  }

  /**
   * Search for sessions with specific criteria
   */
  async searchSessions(applicationId: string, criteria: any): Promise<any[]> {
    // Query D1 for matching sessions
    return []
  }
}
