/**
 * Environment types for Cloudflare Workers
 */

export interface Env {
  // D1 Database
  DB: D1Database

  // R2 Buckets
  EVENTS_ARCHIVE: R2Bucket
  MEDIA_STORAGE: R2Bucket

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset

  // Pipelines
  EVENTS_PIPELINE: Fetcher

  // Queues
  EVENT_QUEUE: Queue

  // Service Bindings
  PAYLOAD_CMS: Fetcher

  // Environment Variables
  ENVIRONMENT: string
  API_VERSION: string
}
