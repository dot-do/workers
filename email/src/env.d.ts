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

  // Service Bindings
  DB: any // Database service

  // Pipelines
  pipeline: any // Events pipeline

  // Dispatch Namespace
  do: any

  // Context (for WorkerEntrypoint)
  ctx?: ExecutionContext
}
