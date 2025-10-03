// Database Benchmark Types

export interface Thing {
  id: string
  ns: string // namespace
  type: string
  content: string
  data?: Record<string, any>
  meta?: Record<string, any>
  embeddings?: number[]
  ts: Date
  ulid: string
}

export interface BenchmarkMetrics {
  operationName: string
  database: string
  datasetSize: number
  iterations: number
  latency: {
    min: number
    max: number
    mean: number
    median: number
    p50: number
    p95: number
    p99: number
  }
  throughput: number // operations per second
  errorRate: number // percentage
  errors: string[]
  timestamp: Date
}

export interface BenchmarkConfig {
  databases: string[] // which databases to test
  datasetSizes: number[] // e.g., [1000, 100000, 1000000]
  iterations: number // how many times to run each test
  warmupIterations: number // warmup runs before measuring
  concurrency: number // concurrent operations for mixed workload
}

export interface DatabaseAdapter {
  name: string
  description: string

  // Lifecycle
  connect(): Promise<void>
  disconnect(): Promise<void>
  migrate(): Promise<void>
  seed(count: number): Promise<void>
  clear(): Promise<void>

  // Reads
  get(ns: string, id: string): Promise<Thing | null>
  list(ns: string, limit: number, offset: number): Promise<Thing[]>
  count(ns: string): Promise<number>
  aggregate(ns: string, field: string): Promise<Record<string, number>>

  // Writes
  insert(thing: Thing): Promise<void>
  batchInsert(things: Thing[]): Promise<void>
  update(ns: string, id: string, data: Partial<Thing>): Promise<void>
  upsert(thing: Thing): Promise<void>
  delete(ns: string, id: string): Promise<void>

  // Search
  fullTextSearch(query: string, limit: number): Promise<Thing[]>
  vectorSearch(embedding: number[], limit: number): Promise<Thing[]>
  hybridSearch(query: string, embedding: number[], limit: number): Promise<Thing[]>

  // Transactions
  transaction<T>(fn: () => Promise<T>): Promise<T>

  // Cost estimation
  estimateCost(operations: number): Promise<number> // cost in USD for N operations
}

export interface BenchmarkResult {
  config: BenchmarkConfig
  metrics: BenchmarkMetrics[]
  summary: BenchmarkSummary
  timestamp: Date
  duration: number // total benchmark duration in ms
}

export interface BenchmarkSummary {
  winner: {
    overall: string
    oltp: string // transactional workloads
    olap: string // analytics workloads
    search: string // full-text and vector search
    costEfficiency: string
  }
  recommendations: {
    database: string
    useCase: string
    reasoning: string
  }[]
  surprises: string[]
}

export type BenchmarkTest = (adapter: DatabaseAdapter, datasetSize: number, iterations: number) => Promise<BenchmarkMetrics>
