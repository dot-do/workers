/**
 * Environment Type Definitions
 *
 * Cloudflare Workers environment bindings and secrets
 */

interface Env {
  // Secrets
  RESEND_API_KEY: string
  WORKOS_API_KEY?: string
  SENDGRID_API_KEY?: string
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string

  // Service Bindings
  DB: any // Database service
  EMAIL_SENDER?: any // Email sender service (for cold email warmup/rate limits)

  // Pipelines
  pipeline: any // Events pipeline

  // Dispatch Namespace
  do: any

  // Cold Email Config
  TRACKING_BASE_URL?: string

  // Context (for WorkerEntrypoint)
  ctx?: ExecutionContext
}
