// Email Validation Service Types

export interface ValidationResult {
  email: string
  valid: boolean
  score: number // 0-100, higher is better
  issues: ValidationIssue[]
  details: ValidationDetails
}

export interface ValidationIssue {
  type: 'syntax' | 'mx' | 'disposable' | 'role' | 'catchall' | 'blacklist'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  recommendation?: string
}

export interface ValidationDetails {
  syntax: SyntaxCheck
  mx: MXCheck
  disposable: DisposableCheck
  role: RoleCheck
  catchall: CatchAllCheck
  provider?: string // Gmail, Outlook, Yahoo, etc.
}

export interface SyntaxCheck {
  valid: boolean
  local: string
  domain: string
  issues: string[]
}

export interface MXCheck {
  valid: boolean
  records: string[]
  priority: number
  hasBackup: boolean
}

export interface DisposableCheck {
  isDisposable: boolean
  provider?: string
}

export interface RoleCheck {
  isRole: boolean
  role?: string // admin, info, support, etc.
}

export interface CatchAllCheck {
  isCatchAll: boolean
  confidence: number // 0-100
}

export interface BulkValidationRequest {
  emails: string[]
  options?: ValidationOptions
}

export interface BulkValidationResponse {
  results: ValidationResult[]
  summary: {
    total: number
    valid: number
    invalid: number
    risky: number // disposable, role, catch-all
    processingTime: number
  }
}

export interface ValidationOptions {
  checkMX?: boolean
  checkDisposable?: boolean
  checkRole?: boolean
  checkCatchAll?: boolean
  timeout?: number // milliseconds
  provider?: 'mailgun' | 'sendgrid' | 'zerobounce' | 'internal'
}

export interface EmailProvider {
  name: string
  apiKey: string
  endpoint: string
  rateLimit: number // requests per minute
}

// Env bindings
export interface Env {
  DB: any // Database service binding
  KV: KVNamespace // Cache for validation results
  QUEUE: Queue // For async bulk validation

  // ESP API keys for validation
  MAILGUN_API_KEY?: string
  SENDGRID_API_KEY?: string
  ZEROBOUNCE_API_KEY?: string
}
