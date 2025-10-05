import type { Env, CostAttribution, CostReport } from '../types'

/**
 * Cost Attribution Engine
 * Tracks costs per service, customer, and resource type
 */
export class CostAttributionEngine {
  constructor(private env: Env) {}

  /**
   * Record cost attribution
   */
  async recordCost(attribution: CostAttribution): Promise<void> {
    // Write to Analytics Engine
    this.env.METRICS.writeDataPoint({
      blobs: [attribution.service, attribution.customer || '', attribution.resourceType, JSON.stringify(attribution.labels)],
      doubles: [attribution.usage, attribution.cost],
      indexes: [attribution.service, attribution.resourceType, attribution.customer || ''],
    })

    // Aggregate in D1 for reporting
    await this.env.DB.prepare(
      `INSERT INTO cost_attribution (
        service, customer, resource_type, usage, cost, timestamp, labels
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(attribution.service, attribution.customer || null, attribution.resourceType, attribution.usage, attribution.cost, Math.floor(attribution.timestamp / 1000), JSON.stringify(attribution.labels))
      .run()
  }

  /**
   * Generate cost report
   */
  async generateReport(from: number, to: number): Promise<CostReport> {
    // Get total cost
    const totalResult = await this.env.DB.prepare(
      `SELECT SUM(cost) as total_cost
       FROM cost_attribution
       WHERE timestamp >= ? AND timestamp <= ?`
    )
      .bind(Math.floor(from / 1000), Math.floor(to / 1000))
      .first()

    const totalCost = (totalResult as any)?.total_cost || 0

    // Breakdown by service
    const byServiceResult = await this.env.DB.prepare(
      `SELECT service, SUM(cost) as cost
       FROM cost_attribution
       WHERE timestamp >= ? AND timestamp <= ?
       GROUP BY service
       ORDER BY cost DESC`
    )
      .bind(Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    const byService: Record<string, number> = {}
    for (const row of byServiceResult.results as any[]) {
      byService[row.service] = row.cost
    }

    // Breakdown by customer
    const byCustomerResult = await this.env.DB.prepare(
      `SELECT customer, SUM(cost) as cost
       FROM cost_attribution
       WHERE timestamp >= ? AND timestamp <= ? AND customer IS NOT NULL
       GROUP BY customer
       ORDER BY cost DESC`
    )
      .bind(Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    const byCustomer: Record<string, number> = {}
    for (const row of byCustomerResult.results as any[]) {
      byCustomer[row.customer] = row.cost
    }

    // Breakdown by resource type
    const byResourceTypeResult = await this.env.DB.prepare(
      `SELECT resource_type, SUM(cost) as cost
       FROM cost_attribution
       WHERE timestamp >= ? AND timestamp <= ?
       GROUP BY resource_type
       ORDER BY cost DESC`
    )
      .bind(Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    const byResourceType: Record<string, number> = {}
    for (const row of byResourceTypeResult.results as any[]) {
      byResourceType[row.resource_type] = row.cost
    }

    // Top cost drivers
    const topDriversResult = await this.env.DB.prepare(
      `SELECT service, resource_type, SUM(cost) as cost
       FROM cost_attribution
       WHERE timestamp >= ? AND timestamp <= ?
       GROUP BY service, resource_type
       ORDER BY cost DESC
       LIMIT 10`
    )
      .bind(Math.floor(from / 1000), Math.floor(to / 1000))
      .all()

    const topCostDrivers = (topDriversResult.results as any[]).map((row) => ({
      name: `${row.service} - ${row.resource_type}`,
      type: row.resource_type,
      cost: row.cost,
      percentage: totalCost > 0 ? (row.cost / totalCost) * 100 : 0,
    }))

    return {
      from,
      to,
      totalCost,
      breakdown: {
        byService,
        byCustomer,
        byResourceType,
      },
      topCostDrivers,
    }
  }

  /**
   * Calculate Cloudflare costs based on usage
   */
  calculateCloudfareCosts(usage: {
    requests: number
    cpu: number // milliseconds
    kv: { reads: number; writes: number; storage: number }
    d1: { reads: number; writes: number; storage: number }
    r2: { reads: number; writes: number; storage: number; egress: number }
    analyticsEngine: { events: number }
    durableObjects: { requests: number; duration: number; storage: number }
  }): Record<string, number> {
    // Cloudflare pricing (as of 2024)
    const pricing = {
      requests: 0.5 / 1_000_000, // $0.50 per million
      cpu: 0.02 / 1_000_000, // $0.02 per million CPU-ms
      kv: {
        reads: 0.5 / 10_000_000, // $0.50 per 10M reads
        writes: 5.0 / 1_000_000, // $5.00 per 1M writes
        storage: 0.5 / 1_000_000_000, // $0.50 per GB/month
      },
      d1: {
        reads: 0.001 / 1_000_000, // $0.001 per million rows read
        writes: 1.0 / 1_000_000, // $1.00 per million rows written
        storage: 0.75 / 1_000_000_000, // $0.75 per GB/month
      },
      r2: {
        reads: 0.36 / 1_000_000, // $0.36 per million Class A ops
        writes: 4.5 / 1_000_000, // $4.50 per million Class B ops
        storage: 0.015 / 1_000_000_000, // $0.015 per GB/month
        egress: 0.0, // Free egress!
      },
      analyticsEngine: {
        events: 0.05 / 1_000_000, // $0.05 per million events
      },
      durableObjects: {
        requests: 1.0 / 1_000_000, // $1.00 per million requests
        duration: 12.5 / 1_000_000, // $12.50 per million GB-sec
        storage: 0.20 / 1_000_000_000, // $0.20 per GB/month
      },
    }

    return {
      requests: usage.requests * pricing.requests,
      cpu: usage.cpu * pricing.cpu,
      kv_reads: usage.kv.reads * pricing.kv.reads,
      kv_writes: usage.kv.writes * pricing.kv.writes,
      kv_storage: usage.kv.storage * pricing.kv.storage,
      d1_reads: usage.d1.reads * pricing.d1.reads,
      d1_writes: usage.d1.writes * pricing.d1.writes,
      d1_storage: usage.d1.storage * pricing.d1.storage,
      r2_reads: usage.r2.reads * pricing.r2.reads,
      r2_writes: usage.r2.writes * pricing.r2.writes,
      r2_storage: usage.r2.storage * pricing.r2.storage,
      r2_egress: usage.r2.egress * pricing.r2.egress,
      analytics_events: usage.analyticsEngine.events * pricing.analyticsEngine.events,
      do_requests: usage.durableObjects.requests * pricing.durableObjects.requests,
      do_duration: usage.durableObjects.duration * pricing.durableObjects.duration,
      do_storage: usage.durableObjects.storage * pricing.durableObjects.storage,
    }
  }

  /**
   * Compare costs to competitors
   */
  compareCosts(events: number): {
    cloudflare: number
    datadog: number
    newRelic: number
    honeycomb: number
    savings: { datadog: number; newRelic: number; honeycomb: number }
  } {
    const cloudflare = events * 0.18 / 1_000_000 // $0.18 per million (our platform)
    const datadog = events * 80.0 / 1_000_000 // $80 per million
    const newRelic = events * 150.0 / 1_000_000 // $150 per million
    const honeycomb = events * 20.0 / 1_000_000 // $20 per million

    return {
      cloudflare,
      datadog,
      newRelic,
      honeycomb,
      savings: {
        datadog: ((datadog - cloudflare) / datadog) * 100,
        newRelic: ((newRelic - cloudflare) / newRelic) * 100,
        honeycomb: ((honeycomb - cloudflare) / honeycomb) * 100,
      },
    }
  }
}
