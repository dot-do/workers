import type { Env, Service, ServiceDependency } from './types'

/**
 * Service map builder for dependency visualization
 */
export class ServiceMap {
  constructor(private env: Env) {}

  /**
   * Get all services
   */
  async getServices(): Promise<Service[]> {
    const result = await this.env.DB.prepare(
      `SELECT id, name, version, environment, worker_name as workerName, description, metadata, last_seen_at
       FROM services
       ORDER BY name`
    ).all()

    return result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      environment: row.environment,
      workerName: row.workerName,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }))
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<Service | null> {
    const result = await this.env.DB.prepare(
      `SELECT id, name, version, environment, worker_name as workerName, description, metadata
       FROM services
       WHERE id = ?`
    )
      .bind(serviceId)
      .first()

    if (!result) return null

    return {
      id: result.id as string,
      name: result.name as string,
      version: result.version as string | undefined,
      environment: result.environment as string,
      workerName: result.workerName as string | undefined,
      description: result.description as string | undefined,
      metadata: result.metadata ? JSON.parse(result.metadata as string) : undefined,
    }
  }

  /**
   * Get all dependencies
   */
  async getDependencies(): Promise<ServiceDependency[]> {
    const result = await this.env.DB.prepare(
      `SELECT
         source_service_id as sourceServiceId,
         target_service_id as targetServiceId,
         dependency_type as dependencyType,
         request_count as requestCount,
         error_count as errorCount,
         avg_latency_ms as avgLatencyMs
       FROM service_dependencies
       ORDER BY request_count DESC`
    ).all()

    return result.results as ServiceDependency[]
  }

  /**
   * Get dependencies for a specific service
   */
  async getServiceDependencies(serviceId: string): Promise<{ upstream: ServiceDependency[]; downstream: ServiceDependency[] }> {
    const [upstreamResult, downstreamResult] = await Promise.all([
      this.env.DB.prepare(
        `SELECT
           source_service_id as sourceServiceId,
           target_service_id as targetServiceId,
           dependency_type as dependencyType,
           request_count as requestCount,
           error_count as errorCount,
           avg_latency_ms as avgLatencyMs
         FROM service_dependencies
         WHERE source_service_id = ?
         ORDER BY request_count DESC`
      )
        .bind(serviceId)
        .all(),

      this.env.DB.prepare(
        `SELECT
           source_service_id as sourceServiceId,
           target_service_id as targetServiceId,
           dependency_type as dependencyType,
           request_count as requestCount,
           error_count as errorCount,
           avg_latency_ms as avgLatencyMs
         FROM service_dependencies
         WHERE target_service_id = ?
         ORDER BY request_count DESC`
      )
        .bind(serviceId)
        .all(),
    ])

    return {
      upstream: upstreamResult.results as ServiceDependency[],
      downstream: downstreamResult.results as ServiceDependency[],
    }
  }

  /**
   * Get service map in Cytoscape.js format for visualization
   */
  async getCytoscapeGraph(): Promise<{ nodes: any[]; edges: any[] }> {
    const [services, dependencies] = await Promise.all([this.getServices(), this.getDependencies()])

    const nodes = services.map((service) => ({
      data: {
        id: service.id,
        label: service.name,
        version: service.version,
        environment: service.environment,
      },
    }))

    const edges = dependencies.map((dep, idx) => ({
      data: {
        id: `edge-${idx}`,
        source: dep.sourceServiceId,
        target: dep.targetServiceId,
        label: dep.dependencyType,
        requestCount: dep.requestCount,
        errorCount: dep.errorCount,
        errorRate: dep.requestCount > 0 ? (dep.errorCount / dep.requestCount) * 100 : 0,
        avgLatencyMs: dep.avgLatencyMs,
      },
    }))

    return { nodes, edges }
  }

  /**
   * Detect circular dependencies
   */
  async detectCircularDependencies(): Promise<string[][]> {
    const dependencies = await this.getDependencies()

    // Build adjacency list
    const graph: Map<string, string[]> = new Map()
    for (const dep of dependencies) {
      if (!graph.has(dep.sourceServiceId)) {
        graph.set(dep.sourceServiceId, [])
      }
      graph.get(dep.sourceServiceId)!.push(dep.targetServiceId)
    }

    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()

    function dfs(node: string, path: string[]): void {
      visited.add(node)
      recStack.add(node)
      path.push(node)

      const neighbors = graph.get(node) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path)
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor)
          cycles.push([...path.slice(cycleStart), neighbor])
        }
      }

      recStack.delete(node)
      path.pop()
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  /**
   * Calculate service health score based on dependencies
   */
  async getServiceHealthScore(serviceId: string): Promise<number> {
    const { upstream } = await this.getServiceDependencies(serviceId)

    if (upstream.length === 0) return 100 // no dependencies = healthy

    let totalScore = 0
    for (const dep of upstream) {
      const errorRate = dep.requestCount > 0 ? (dep.errorCount / dep.requestCount) * 100 : 0
      const latencyScore = Math.max(0, 100 - dep.avgLatencyMs / 10) // penalize high latency
      const errorScore = Math.max(0, 100 - errorRate * 2) // heavily penalize errors

      totalScore += (latencyScore + errorScore) / 2
    }

    return totalScore / upstream.length
  }
}
