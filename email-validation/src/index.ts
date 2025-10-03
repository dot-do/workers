// Email Validation Service
// Validates emails via syntax, MX, disposable, role, catch-all checks

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Env, ValidationResult, ValidationOptions, BulkValidationResponse, ValidationIssue, ValidationDetails } from './types'
import { validateEmailSchema, bulkValidateSchema } from './schema'

// RPC Interface
export class EmailValidationService extends WorkerEntrypoint<Env> {
  /**
   * Validate a single email address
   */
  async validateEmail(email: string, options: ValidationOptions = {}): Promise<ValidationResult> {
    const opts = { checkMX: true, checkDisposable: true, checkRole: true, checkCatchAll: false, timeout: 5000, ...options }

    // Check cache first (KV)
    const cacheKey = `validation:${email}:${JSON.stringify(opts)}`
    const cached = await this.env.KV.get(cacheKey, 'json')
    if (cached) return cached as ValidationResult

    const issues: ValidationIssue[] = []
    let score = 100

    // 1. Syntax validation
    const syntaxCheck = this.validateSyntax(email)
    if (!syntaxCheck.valid) {
      issues.push({ type: 'syntax', severity: 'critical', message: 'Invalid email syntax', recommendation: 'Fix email format' })
      score = 0
    }

    let mxCheck = { valid: false, records: [], priority: 0, hasBackup: false }
    let disposableCheck = { isDisposable: false }
    let roleCheck = { isRole: false }
    let catchallCheck = { isCatchAll: false, confidence: 0 }

    if (syntaxCheck.valid) {
      // 2. MX Record validation
      if (opts.checkMX) {
        mxCheck = await this.checkMX(syntaxCheck.domain)
        if (!mxCheck.valid) {
          issues.push({ type: 'mx', severity: 'critical', message: 'No MX records found', recommendation: 'Domain may not accept emails' })
          score -= 50
        } else if (!mxCheck.hasBackup) {
          score -= 5 // slightly lower score for no backup MX
        }
      }

      // 3. Disposable email detection
      if (opts.checkDisposable) {
        disposableCheck = await this.checkDisposable(syntaxCheck.domain)
        if (disposableCheck.isDisposable) {
          issues.push({ type: 'disposable', severity: 'high', message: 'Disposable email domain', recommendation: 'Avoid sending to disposable addresses' })
          score -= 30
        }
      }

      // 4. Role-based address detection
      if (opts.checkRole) {
        roleCheck = this.checkRole(syntaxCheck.local)
        if (roleCheck.isRole) {
          issues.push({ type: 'role', severity: 'medium', message: `Role-based address: ${roleCheck.role}`, recommendation: 'Role addresses have lower engagement' })
          score -= 15
        }
      }

      // 5. Catch-all detection (expensive, only if requested)
      if (opts.checkCatchAll && mxCheck.valid) {
        catchallCheck = await this.checkCatchAll(syntaxCheck.domain)
        if (catchallCheck.isCatchAll) {
          issues.push({ type: 'catchall', severity: 'low', message: 'Domain accepts all emails (catch-all)', recommendation: 'May be risky for cold outreach' })
          score -= 10
        }
      }
    }

    const result: ValidationResult = {
      email,
      valid: syntaxCheck.valid && mxCheck.valid && !disposableCheck.isDisposable,
      score: Math.max(0, score),
      issues,
      details: {
        syntax: syntaxCheck,
        mx: mxCheck,
        disposable: disposableCheck,
        role: roleCheck,
        catchall: catchallCheck,
        provider: this.detectProvider(syntaxCheck.domain),
      },
    }

    // Cache result for 24 hours
    await this.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 })

    return result
  }

  /**
   * Bulk validate emails (up to 10,000 at once)
   */
  async bulkValidate(emails: string[], options: ValidationOptions = {}): Promise<BulkValidationResponse> {
    const startTime = Date.now()
    const results: ValidationResult[] = []

    // Process in parallel (batches of 100)
    const batchSize = 100
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((email) => this.validateEmail(email, options)))
      results.push(...batchResults)
    }

    const valid = results.filter((r) => r.valid).length
    const invalid = results.filter((r) => !r.valid).length
    const risky = results.filter((r) => r.details.disposable.isDisposable || r.details.role.isRole || r.details.catchall.isCatchAll).length

    return {
      results,
      summary: {
        total: results.length,
        valid,
        invalid,
        risky,
        processingTime: Date.now() - startTime,
      },
    }
  }

  /**
   * Validate email syntax using RFC 5322 rules
   */
  private validateSyntax(email: string) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const valid = emailRegex.test(email)

    const parts = email.split('@')
    const issues: string[] = []

    if (parts.length !== 2) {
      issues.push('Email must have exactly one @ symbol')
    }

    const [local, domain] = parts
    if (local && local.length > 64) issues.push('Local part too long (>64 chars)')
    if (domain && domain.length > 255) issues.push('Domain too long (>255 chars)')

    return { valid, local: local || '', domain: domain || '', issues }
  }

  /**
   * Check MX records for domain
   */
  private async checkMX(domain: string) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`)
      const data: any = await response.json()

      if (data.Answer && data.Answer.length > 0) {
        const records = data.Answer.map((r: any) => r.data).sort()
        return {
          valid: true,
          records,
          priority: data.Answer[0]?.priority || 0,
          hasBackup: data.Answer.length > 1,
        }
      }

      return { valid: false, records: [], priority: 0, hasBackup: false }
    } catch {
      return { valid: false, records: [], priority: 0, hasBackup: false }
    }
  }

  /**
   * Check if domain is disposable email provider
   */
  private async checkDisposable(domain: string) {
    // Common disposable domains (in production, use larger list or API)
    const disposableDomains = new Set([
      'tempmail.com',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email',
      'temp-mail.org',
      'sharklasers.com',
      'guerrillamail.info',
      'grr.la',
      'guerrillamail.biz',
      'spam4.me',
      'maildrop.cc',
    ])

    const isDisposable = disposableDomains.has(domain.toLowerCase())
    return { isDisposable, provider: isDisposable ? domain : undefined }
  }

  /**
   * Check if email local part is role-based
   */
  private checkRole(local: string) {
    const roleAddresses = new Set(['admin', 'info', 'support', 'sales', 'contact', 'help', 'noreply', 'no-reply', 'billing', 'marketing', 'webmaster', 'postmaster'])

    const isRole = roleAddresses.has(local.toLowerCase())
    return { isRole, role: isRole ? local.toLowerCase() : undefined }
  }

  /**
   * Check if domain is catch-all (accepts any email)
   */
  private async checkCatchAll(domain: string) {
    // Generate random email and check if it's accepted
    // This is a simplified version - production should use SMTP verification
    const randomLocal = Math.random().toString(36).substring(7)
    const testEmail = `${randomLocal}@${domain}`

    // In production, this would do SMTP RCPT TO verification
    // For now, return low confidence catch-all detection
    return { isCatchAll: false, confidence: 0 }
  }

  /**
   * Detect email provider (Gmail, Outlook, etc.)
   */
  private detectProvider(domain: string): string | undefined {
    const providers: Record<string, string> = {
      'gmail.com': 'Gmail',
      'googlemail.com': 'Gmail',
      'outlook.com': 'Outlook',
      'hotmail.com': 'Outlook',
      'live.com': 'Outlook',
      'yahoo.com': 'Yahoo',
      'ymail.com': 'Yahoo',
      'aol.com': 'AOL',
      'icloud.com': 'iCloud',
      'me.com': 'iCloud',
      'protonmail.com': 'ProtonMail',
      'proton.me': 'ProtonMail',
    }

    return providers[domain.toLowerCase()]
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => c.json({ status: 'ok', service: 'email-validation' }))

app.post('/validate', zValidator('json', validateEmailSchema), async (c) => {
  const { email, options } = c.req.valid('json')
  const service = new EmailValidationService(c.executionCtx, c.env)
  const result = await service.validateEmail(email, options)
  return c.json(result)
})

app.post('/validate/bulk', zValidator('json', bulkValidateSchema), async (c) => {
  const { emails, options } = c.req.valid('json')
  const service = new EmailValidationService(c.executionCtx, c.env)
  const result = await service.bulkValidate(emails, options)
  return c.json(result)
})

export default { fetch: app.fetch }
