/**
 * Blacklist Monitor Service
 * Checks domains and IPs against major DNSBL services
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env, CheckBlacklistRequest, BlacklistCheckResponse, BlacklistResult, BlacklistHistoryEntry, DelistingRequest } from './types'
import { BLACKLISTS, getHighAuthorityBlacklists, getIPBlacklists, getDomainBlacklists, getBlacklistByName } from './blacklists'

/**
 * Blacklist Monitor RPC Interface
 */
export class BlacklistMonitorService extends WorkerEntrypoint<Env> {
  /**
   * Check if domain or IP is blacklisted
   */
  async checkBlacklists(request: CheckBlacklistRequest): Promise<BlacklistCheckResponse> {
    if (!request.domain && !request.ip) {
      throw new Error('Either domain or IP must be provided')
    }

    // Determine which blacklists to check
    let blacklistsToCheck = BLACKLISTS

    if (request.blacklists && request.blacklists.length > 0) {
      // Check specific blacklists
      blacklistsToCheck = request.blacklists.map((name) => getBlacklistByName(name)).filter((bl): bl is NonNullable<typeof bl> => bl !== undefined)
    } else if (!request.checkAll) {
      // Default: check only high-authority blacklists
      blacklistsToCheck = getHighAuthorityBlacklists()
    }

    // Filter by type
    if (request.ip && !request.domain) {
      blacklistsToCheck = blacklistsToCheck.filter((bl) => bl.type === 'ip' || bl.type === 'both')
    } else if (request.domain && !request.ip) {
      blacklistsToCheck = blacklistsToCheck.filter((bl) => bl.type === 'domain' || bl.type === 'both')
    }

    // Perform checks in parallel
    const checkPromises = blacklistsToCheck.map((blacklist) => this.checkSingleBlacklist(request.domain, request.ip, blacklist))

    const results = await Promise.all(checkPromises)

    // Filter out results that are listed
    const listedResults = results.filter((r) => r.listed)
    const listedBlacklists = listedResults.map((r) => r.blacklist)

    // Determine severity
    let severity: 'critical' | 'warning' | 'clean' = 'clean'
    if (listedBlacklists.length > 0) {
      // Check if listed on any high-authority blacklist
      const highAuthorityListed = listedResults.some((r) => {
        const bl = getBlacklistByName(r.blacklist)
        return bl && bl.authority === 'high'
      })

      severity = highAuthorityListed ? 'critical' : 'warning'
    }

    const response: BlacklistCheckResponse = {
      domain: request.domain,
      ip: request.ip,
      listed: listedBlacklists.length > 0,
      blacklistCount: listedBlacklists.length,
      blacklists: listedBlacklists,
      results,
      severity,
      timestamp: new Date().toISOString(),
    }

    // Store result in database
    await this.storeBlacklistCheck(response)

    return response
  }

  /**
   * Get blacklist history for domain or IP
   */
  async getHistory(domain?: string, ip?: string, limit = 10): Promise<BlacklistHistoryEntry[]> {
    if (!domain && !ip) {
      throw new Error('Either domain or IP must be provided')
    }

    let query = 'SELECT * FROM blacklist_history WHERE '
    const params: any[] = []

    if (domain) {
      query += 'domain = ?'
      params.push(domain)
    } else {
      query += 'ip = ?'
      params.push(ip)
    }

    query += ' ORDER BY listed_at DESC LIMIT ?'
    params.push(limit)

    const stmt = this.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    return (result.results || []).map(
      (row: any): BlacklistHistoryEntry => ({
        id: row.id,
        domain: row.domain,
        ip: row.ip,
        blacklist: row.blacklist,
        listed: row.listed === 1,
        listedAt: row.listed_at,
        delistedAt: row.delisted_at,
        reason: row.reason,
        severity: row.severity,
        resolved: row.resolved === 1,
      })
    )
  }

  /**
   * Get active delisting requests
   */
  async getDelistingRequests(domain?: string, ip?: string): Promise<DelistingRequest[]> {
    let query = 'SELECT * FROM delisting_requests WHERE status != "completed"'
    const params: any[] = []

    if (domain) {
      query += ' AND domain = ?'
      params.push(domain)
    } else if (ip) {
      query += ' AND ip = ?'
      params.push(ip)
    }

    query += ' ORDER BY requested_at DESC'

    const stmt = this.env.DB.prepare(query)
    const result = await stmt.bind(...params).all()

    return (result.results || []).map(
      (row: any): DelistingRequest => ({
        blacklist: row.blacklist,
        domain: row.domain,
        ip: row.ip,
        status: row.status,
        requestedAt: row.requested_at,
        completedAt: row.completed_at,
        notes: row.notes,
      })
    )
  }

  /**
   * Create delisting request
   */
  async createDelistingRequest(blacklist: string, domain?: string, ip?: string, notes?: string): Promise<DelistingRequest> {
    if (!domain && !ip) {
      throw new Error('Either domain or IP must be provided')
    }

    const request: DelistingRequest = {
      blacklist,
      domain,
      ip,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      notes,
    }

    await this.env.DB.prepare(
      `INSERT INTO delisting_requests (blacklist, domain, ip, status, requested_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(blacklist, domain || null, ip || null, request.status, request.requestedAt, notes || null)
      .run()

    return request
  }

  /**
   * Check a single blacklist via DNS lookup
   */
  private async checkSingleBlacklist(domain: string | undefined, ip: string | undefined, blacklist: typeof BLACKLISTS[0]): Promise<BlacklistResult> {
    const startTime = Date.now()
    const result: BlacklistResult = {
      blacklist: blacklist.name,
      listed: false,
      checkedAt: new Date().toISOString(),
      responseTime: 0,
    }

    try {
      let query: string

      if (blacklist.type === 'domain' && domain) {
        // Domain blacklist check
        query = `${domain}.${blacklist.dnsbl}`
      } else if (blacklist.type === 'ip' && ip) {
        // IP blacklist check - reverse the IP
        const reversed = ip.split('.').reverse().join('.')
        query = `${reversed}.${blacklist.dnsbl}`
      } else if (blacklist.type === 'both') {
        // Can check either
        if (ip) {
          const reversed = ip.split('.').reverse().join('.')
          query = `${reversed}.${blacklist.dnsbl}`
        } else if (domain) {
          query = `${domain}.${blacklist.dnsbl}`
        } else {
          result.responseTime = Date.now() - startTime
          return result
        }
      } else {
        result.responseTime = Date.now() - startTime
        return result
      }

      // Perform DNS lookup
      const dnsResult = await this.dnsLookup(query)

      if (dnsResult.found) {
        result.listed = true
        result.returnCode = dnsResult.code
        result.reason = this.getBlacklistReason(dnsResult.code, blacklist.name)
      }
    } catch (error) {
      console.error(`Error checking ${blacklist.name}:`, error)
    }

    result.responseTime = Date.now() - startTime
    return result
  }

  /**
   * Perform DNS A record lookup
   */
  private async dnsLookup(query: string): Promise<{ found: boolean; code?: string }> {
    try {
      // Use Cloudflare DNS over HTTPS
      const response = await fetch(`https://1.1.1.1/dns-query?name=${query}&type=A`, {
        headers: {
          accept: 'application/dns-json',
        },
      })

      const data: any = await response.json()

      if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
        // Found - listed on blacklist
        const answer = data.Answer[0]
        return {
          found: true,
          code: answer.data,
        }
      }

      return { found: false }
    } catch (error) {
      console.error('DNS lookup error:', error)
      return { found: false }
    }
  }

  /**
   * Get human-readable reason for blacklist code
   */
  private getBlacklistReason(code: string | undefined, blacklistName: string): string {
    if (!code) return 'Listed'

    // Spamhaus return codes
    if (blacklistName.includes('Spamhaus')) {
      const reasons: Record<string, string> = {
        '127.0.0.2': 'SBL - Spam source',
        '127.0.0.3': 'SBL - Spam operations',
        '127.0.0.4': 'XBL - Exploited hosts',
        '127.0.0.9': 'SBL - Drop/Edrop',
        '127.0.0.10': 'PBL - Policy block',
        '127.0.0.11': 'PBL - Unallocated',
      }
      return reasons[code] || `Listed (${code})`
    }

    return `Listed (${code})`
  }

  /**
   * Store blacklist check result in database
   */
  private async storeBlacklistCheck(response: BlacklistCheckResponse): Promise<void> {
    try {
      // Store check result
      await this.env.DB.prepare(
        `INSERT INTO blacklist_checks (domain, ip, listed, blacklist_count, blacklists, severity, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          response.domain || null,
          response.ip || null,
          response.listed ? 1 : 0,
          response.blacklistCount,
          JSON.stringify(response.blacklists),
          response.severity,
          response.timestamp
        )
        .run()

      // Store history entries for each listing
      for (const result of response.results) {
        if (result.listed) {
          // Check if already exists in history
          const existing = await this.env.DB.prepare('SELECT id FROM blacklist_history WHERE domain = ? AND ip = ? AND blacklist = ? AND delisted_at IS NULL')
            .bind(response.domain || null, response.ip || null, result.blacklist)
            .first()

          if (!existing) {
            // New listing
            await this.env.DB.prepare(
              `INSERT INTO blacklist_history (domain, ip, blacklist, listed, listed_at, reason, severity, resolved)
               VALUES (?, ?, ?, 1, ?, ?, ?, 0)`
            )
              .bind(
                response.domain || null,
                response.ip || null,
                result.blacklist,
                result.checkedAt,
                result.reason || 'Listed',
                response.severity,
              )
              .run()
          }
        } else {
          // Check if was previously listed and mark as delisted
          const existing = await this.env.DB.prepare('SELECT id FROM blacklist_history WHERE domain = ? AND ip = ? AND blacklist = ? AND delisted_at IS NULL')
            .bind(response.domain || null, response.ip || null, result.blacklist)
            .first()

          if (existing) {
            // Mark as delisted
            await this.env.DB.prepare('UPDATE blacklist_history SET delisted_at = ?, resolved = 1 WHERE id = ?')
              .bind(result.checkedAt, existing.id)
              .run()
          }
        }
      }
    } catch (error) {
      console.error('Error storing blacklist check:', error)
    }
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Helper functions
const success = <T>(data: T) => ({ success: true, data })
const error = (message: string, details?: unknown) => ({ success: false, error: message, details })

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'blacklist-monitor', version: '1.0.0' }))

// Check blacklists
app.post('/check', async (c) => {
  try {
    const body = await c.req.json<CheckBlacklistRequest>()
    const service = new BlacklistMonitorService(c.env.ctx, c.env)
    const result = await service.checkBlacklists(body)
    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Quick check (high-authority blacklists only)
app.get('/check/:target', async (c) => {
  try {
    const target = c.req.param('target')
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(target)

    const service = new BlacklistMonitorService(c.env.ctx, c.env)
    const result = await service.checkBlacklists({
      [isIP ? 'ip' : 'domain']: target,
      checkAll: false, // High-authority only
    })

    return c.json(success(result))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get history
app.get('/history/:target', async (c) => {
  try {
    const target = c.req.param('target')
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(target)
    const limit = parseInt(c.req.query('limit') || '10')

    const service = new BlacklistMonitorService(c.env.ctx, c.env)
    const history = await service.getHistory(isIP ? undefined : target, isIP ? target : undefined, limit)

    return c.json(success(history))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Get delisting requests
app.get('/delisting/:target', async (c) => {
  try {
    const target = c.req.param('target')
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(target)

    const service = new BlacklistMonitorService(c.env.ctx, c.env)
    const requests = await service.getDelistingRequests(isIP ? undefined : target, isIP ? target : undefined)

    return c.json(success(requests))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// Create delisting request
app.post('/delisting', async (c) => {
  try {
    const body = await c.req.json<{ blacklist: string; domain?: string; ip?: string; notes?: string }>()
    const service = new BlacklistMonitorService(c.env.ctx, c.env)
    const request = await service.createDelistingRequest(body.blacklist, body.domain, body.ip, body.notes)

    return c.json(success(request))
  } catch (err: any) {
    return c.json(error(err.message), 400)
  }
})

// List available blacklists
app.get('/blacklists', (c) => {
  return c.json(success(BLACKLISTS))
})

export default {
  fetch: app.fetch,
}
