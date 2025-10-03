/**
 * DNS Tools Service
 * Comprehensive DNS, IP, ASN, and WHOIS lookup service
 * Exposes both RPC (WorkerEntrypoint) and HTTP (Hono) interfaces
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env, DNSRecordType, LookupRequest, LookupResponse, BulkLookupRequest, BulkLookupResponse, SPFRecord, DKIMRecord, DMARCRecord, EmailAuthValidation } from './types'
import { dnsLookup, dnsLookupAll } from './dns'
import { ipLookup, ipLookupBatch, getIPFromRequest } from './ip'
import { asnLookup, getASNFromIP } from './asn'
import { hostnameLookup, hostnameLookupBatch } from './hostname'
import { whoisLookup, whoisLookupBatch } from './whois'
import { generateSPFRecord, validateSPFRecord, generateDKIMRecord, validateDKIMRecord, generateDMARCRecord, validateDMARCRecord, validateEmailAuth } from './email-auth'

/**
 * RPC Interface - Service Bindings
 */
export class DNSToolsService extends WorkerEntrypoint<Env> {
  /**
   * DNS lookup
   */
  async dns(domain: string, recordType: DNSRecordType = 'A') {
    return await dnsLookup(domain, recordType)
  }

  /**
   * DNS lookup all record types
   */
  async dnsAll(domain: string) {
    return await dnsLookupAll(domain)
  }

  /**
   * IP geolocation lookup
   */
  async ip(ip: string) {
    return await ipLookup(ip, this.env)
  }

  /**
   * Batch IP lookup
   */
  async ipBatch(ips: string[]) {
    return await ipLookupBatch(ips, this.env)
  }

  /**
   * ASN lookup
   */
  async asn(asn: string) {
    return await asnLookup(asn, this.env)
  }

  /**
   * Get ASN from IP
   */
  async getASN(ip: string) {
    return await getASNFromIP(ip, this.env)
  }

  /**
   * Reverse DNS (hostname) lookup
   */
  async hostname(ip: string) {
    return await hostnameLookup(ip)
  }

  /**
   * Batch hostname lookup
   */
  async hostnameBatch(ips: string[]) {
    return await hostnameLookupBatch(ips)
  }

  /**
   * WHOIS lookup
   */
  async whois(domain: string) {
    return await whoisLookup(domain, this.env)
  }

  /**
   * Batch WHOIS lookup
   */
  async whoisBatch(domains: string[]) {
    return await whoisLookupBatch(domains, this.env)
  }

  /**
   * Unified lookup interface
   */
  async lookup(request: LookupRequest) {
    switch (request.type) {
      case 'dns':
        return await dnsLookup(request.target, request.recordType || 'A')
      case 'ip':
        return await ipLookup(request.target, this.env)
      case 'asn':
        return await asnLookup(request.target, this.env)
      case 'hostname':
        return await hostnameLookup(request.target)
      case 'whois':
        return await whoisLookup(request.target, this.env)
      default:
        throw new Error(`Unknown lookup type: ${(request as any).type}`)
    }
  }

  /**
   * Bulk lookup interface
   */
  async bulkLookup(request: BulkLookupRequest): Promise<BulkLookupResponse> {
    const start = Date.now()

    let results: LookupResponse[]
    if (request.parallel) {
      results = await Promise.all(request.lookups.map((lookup) => this.lookup(lookup)))
    } else {
      results = []
      for (const lookup of request.lookups) {
        const result = await this.lookup(lookup)
        results.push(result)
      }
    }

    const successCount = results.filter((r) => !(r as any).error).length
    const errorCount = results.length - successCount

    return {
      results,
      totalTime: Date.now() - start,
      successCount,
      errorCount,
    }
  }

  /**
   * Email Authentication - SPF
   */
  generateSPF(config: {
    ipv4?: string[]
    ipv6?: string[]
    includes?: string[]
    a?: boolean
    mx?: boolean
    qualifier?: '~' | '-' | '?' | '+'
  }): SPFRecord {
    return generateSPFRecord(config)
  }

  async validateSPF(domain: string): Promise<SPFRecord> {
    return await validateSPFRecord(domain)
  }

  /**
   * Email Authentication - DKIM
   */
  async generateDKIM(config: { domain: string; selector?: string; keySize?: 1024 | 2048 }): Promise<DKIMRecord> {
    return await generateDKIMRecord(config)
  }

  async validateDKIM(domain: string, selector?: string): Promise<DKIMRecord> {
    return await validateDKIMRecord(domain, selector)
  }

  /**
   * Email Authentication - DMARC
   */
  generateDMARC(config: {
    domain: string
    policy: 'none' | 'quarantine' | 'reject'
    subdomainPolicy?: 'none' | 'quarantine' | 'reject'
    percentage?: number
    rua?: string[]
    ruf?: string[]
    adkim?: 'r' | 's'
    aspf?: 'r' | 's'
  }): DMARCRecord {
    return generateDMARCRecord(config)
  }

  async validateDMARC(domain: string): Promise<DMARCRecord> {
    return await validateDMARCRecord(domain)
  }

  /**
   * Complete Email Authentication Validation
   */
  async validateEmailAuth(domain: string, dkimSelector?: string): Promise<EmailAuthValidation> {
    return await validateEmailAuth(domain, dkimSelector)
  }
}

/**
 * HTTP Interface - REST API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'dns-tools',
    version: '1.0.0',
    endpoints: {
      dns: 'GET /dns/:domain?type=A',
      dnsAll: 'GET /dns/:domain/all',
      ip: 'GET /ip/:ip',
      ipBatch: 'POST /ip/batch',
      asn: 'GET /asn/:asn',
      hostname: 'GET /hostname/:ip',
      hostnameBatch: 'POST /hostname/batch',
      whois: 'GET /whois/:domain',
      whoisBatch: 'POST /whois/batch',
      lookup: 'POST /lookup',
      bulkLookup: 'POST /lookup/bulk',
    },
  })
})

// DNS lookup
app.get('/dns/:domain', async (c) => {
  const domain = c.req.param('domain')
  const recordType = (c.req.query('type') as DNSRecordType) || 'A'
  const result = await dnsLookup(domain, recordType)
  return c.json(result)
})

// DNS lookup all
app.get('/dns/:domain/all', async (c) => {
  const domain = c.req.param('domain')
  const result = await dnsLookupAll(domain)
  return c.json(result)
})

// IP lookup
app.get('/ip/:ip', async (c) => {
  const ip = c.req.param('ip')
  const result = await ipLookup(ip, c.env)
  return c.json(result)
})

// IP batch lookup
app.post('/ip/batch', async (c) => {
  const { ips } = await c.req.json<{ ips: string[] }>()
  const result = await ipLookupBatch(ips, c.env)
  return c.json(result)
})

// Current request IP info
app.get('/ip', (c) => {
  const result = getIPFromRequest(c.req.raw)
  return c.json(result)
})

// ASN lookup
app.get('/asn/:asn', async (c) => {
  const asn = c.req.param('asn')
  const result = await asnLookup(asn, c.env)
  return c.json(result)
})

// Hostname (reverse DNS) lookup
app.get('/hostname/:ip', async (c) => {
  const ip = c.req.param('ip')
  const result = await hostnameLookup(ip)
  return c.json(result)
})

// Hostname batch lookup
app.post('/hostname/batch', async (c) => {
  const { ips } = await c.req.json<{ ips: string[] }>()
  const result = await hostnameLookupBatch(ips)
  return c.json(result)
})

// WHOIS lookup
app.get('/whois/:domain', async (c) => {
  const domain = c.req.param('domain')
  const result = await whoisLookup(domain, c.env)
  return c.json(result)
})

// WHOIS batch lookup
app.post('/whois/batch', async (c) => {
  const { domains } = await c.req.json<{ domains: string[] }>()
  const result = await whoisLookupBatch(domains, c.env)
  return c.json(result)
})

// Unified lookup
app.post('/lookup', async (c) => {
  const request = await c.req.json<LookupRequest>()
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.lookup(request)
  return c.json(result)
})

// Bulk lookup
app.post('/lookup/bulk', async (c) => {
  const request = await c.req.json<BulkLookupRequest>()
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.bulkLookup(request)
  return c.json(result)
})

// Email Authentication - SPF
app.post('/email-auth/spf/generate', async (c) => {
  const config = await c.req.json()
  const service = new DNSToolsService({} as any, c.env)
  const result = service.generateSPF(config)
  return c.json(result)
})

app.get('/email-auth/spf/:domain', async (c) => {
  const domain = c.req.param('domain')
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.validateSPF(domain)
  return c.json(result)
})

// Email Authentication - DKIM
app.post('/email-auth/dkim/generate', async (c) => {
  const config = await c.req.json()
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.generateDKIM(config)
  return c.json(result)
})

app.get('/email-auth/dkim/:domain', async (c) => {
  const domain = c.req.param('domain')
  const selector = c.req.query('selector') || 'default'
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.validateDKIM(domain, selector)
  return c.json(result)
})

// Email Authentication - DMARC
app.post('/email-auth/dmarc/generate', async (c) => {
  const config = await c.req.json()
  const service = new DNSToolsService({} as any, c.env)
  const result = service.generateDMARC(config)
  return c.json(result)
})

app.get('/email-auth/dmarc/:domain', async (c) => {
  const domain = c.req.param('domain')
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.validateDMARC(domain)
  return c.json(result)
})

// Complete Email Authentication Validation
app.get('/email-auth/validate/:domain', async (c) => {
  const domain = c.req.param('domain')
  const selector = c.req.query('selector')
  const service = new DNSToolsService({} as any, c.env)
  const result = await service.validateEmailAuth(domain, selector)
  return c.json(result)
})

export default app
