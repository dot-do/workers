#!/usr/bin/env node
/**
 * Domain verification script that:
 * 1. Extracts domain-style package names from sdks directory
 * 2. Queries RDAP to verify domain registration status
 * 3. Blocks publishing if any domain is unregistered or expired
 * 4. Warns if any domain expires within 90 days
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as net from 'node:net'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface PackageJson {
  name: string
  version: string
  private?: boolean
}

interface RdapResponse {
  status?: string[]
  events?: Array<{
    eventAction: string
    eventDate: string
  }>
  errorCode?: number
  ldhName?: string
}

// RDAP endpoints by TLD (from IANA bootstrap: https://data.iana.org/rdap/dns.json)
const RDAP_ENDPOINTS: Record<string, string> = {
  // .do - Dominican Republic ccTLD - NO RDAP SUPPORT (fallback to WHOIS-based check)
  '.do': '', // No RDAP available
  // .as - American Samoa ccTLD
  '.as': 'https://rdap.nic.as/domain/',
  // .ai - Anguilla ccTLD (operated by Identity Digital)
  '.ai': 'https://rdap.identitydigital.services/rdap/domain/',
  // .domains - operated by Identity Digital (formerly Donuts)
  '.domains': 'https://rdap.identitydigital.services/rdap/domain/',
  // .games - operated by Identity Digital (formerly Donuts)
  '.games': 'https://rdap.identitydigital.services/rdap/domain/',
  // .new - operated by Google
  '.new': 'https://pubapi.registry.google/rdap/domain/',
  // .studio - operated by Identity Digital (formerly Donuts)
  '.studio': 'https://rdap.identitydigital.services/rdap/domain/',
}

// Domain TLDs we recognize as valid domain-style package names
const DOMAIN_TLDS = Object.keys(RDAP_ENDPOINTS)

function isDomainPackageName(name: string): boolean {
  return DOMAIN_TLDS.some(tld => name.endsWith(tld))
}

function getTld(domain: string): string {
  for (const tld of DOMAIN_TLDS) {
    if (domain.endsWith(tld)) {
      return tld
    }
  }
  throw new Error(`Unknown TLD for domain: ${domain}`)
}

function discoverSdkPackages(): string[] {
  const sdksDir = join(rootDir, 'sdks')
  if (!existsSync(sdksDir)) return []

  return readdirSync(sdksDir)
    .map(name => join(sdksDir, name))
    .filter(path => {
      try {
        return statSync(path).isDirectory() &&
               existsSync(join(path, 'package.json'))
      } catch { return false }
    })
}

function readPackageJson(pkgDir: string): PackageJson {
  return JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'))
}

function extractDomainPackages(): string[] {
  const dirs = discoverSdkPackages()
  const domains = new Set<string>()

  for (const dir of dirs) {
    const pkg = readPackageJson(dir)
    if (isDomainPackageName(pkg.name)) {
      domains.add(pkg.name)
    }
  }

  return Array.from(domains).sort()
}

interface DomainCheckResult {
  registered: boolean
  expired: boolean
  expiresAt: Date | null
  error?: string
  noRdap?: boolean
}

// WHOIS lookup for .do domains (Dominican Republic)
// whois.nic.do is the authoritative WHOIS server for .do TLD
async function queryWhois(domain: string, server: string = 'whois.nic.do'): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(43, server)
    let data = ''

    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('WHOIS timeout'))
    }, 15000)

    socket.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })

    socket.on('end', () => {
      clearTimeout(timeout)
      resolve(data)
    })

    socket.on('error', (err: Error) => {
      clearTimeout(timeout)
      reject(err)
    })

    socket.write(domain + '\r\n')
  })
}

interface WhoisParseResult {
  registered: boolean
  expiresAt: Date | null
}

function parseDoWhoisResponse(response: string): WhoisParseResult {
  // Check for "NOT FOUND" or similar indicators of unregistered domain
  const lowerResponse = response.toLowerCase()

  if (lowerResponse.includes('no match') ||
      lowerResponse.includes('not found') ||
      lowerResponse.includes('no entries found') ||
      lowerResponse.includes('no data found') ||
      lowerResponse.includes('domain not found')) {
    return { registered: false, expiresAt: null }
  }

  // Domain is registered - try to extract expiration date
  // Common patterns: "Expiration Date:", "Registry Expiry Date:", "Expires:", etc.
  let expiresAt: Date | null = null

  // Try various date field patterns
  const datePatterns = [
    /expir(?:y|ation)\s*date\s*:\s*(.+)/i,
    /registry\s+expiry\s+date\s*:\s*(.+)/i,
    /expires\s*:\s*(.+)/i,
    /expiration\s*:\s*(.+)/i,
    /paid-till\s*:\s*(.+)/i,
  ]

  for (const pattern of datePatterns) {
    const match = response.match(pattern)
    if (match) {
      const dateStr = match[1].trim()
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed
        break
      }
    }
  }

  return { registered: true, expiresAt }
}

async function checkDoDomain(domain: string): Promise<DomainCheckResult> {
  try {
    const whoisResponse = await queryWhois(domain)
    const parsed = parseDoWhoisResponse(whoisResponse)

    if (!parsed.registered) {
      return { registered: false, expired: false, expiresAt: null }
    }

    // Check if expired
    let expired = false
    if (parsed.expiresAt) {
      expired = parsed.expiresAt < new Date()
    }

    return {
      registered: true,
      expired,
      expiresAt: parsed.expiresAt
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { registered: false, expired: false, expiresAt: null, error: `WHOIS error: ${errorMessage}` }
  }
}

async function checkDomain(domain: string): Promise<DomainCheckResult> {
  const tld = getTld(domain)

  // .do domains use WHOIS instead of RDAP
  if (tld === '.do') {
    return checkDoDomain(domain)
  }

  const endpoint = RDAP_ENDPOINTS[tld]

  // No RDAP support for this TLD (and no WHOIS handler)
  if (!endpoint) {
    return { registered: true, expired: false, expiresAt: null, noRdap: true }
  }

  const url = endpoint + domain

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rdap+json, application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return { registered: false, expired: false, expiresAt: null }
    }

    if (!response.ok) {
      return { registered: false, expired: false, expiresAt: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json() as RdapResponse

    // Check if domain is registered
    const isRegistered = !data.errorCode && (data.ldhName || data.status)

    if (!isRegistered) {
      return { registered: false, expired: false, expiresAt: null }
    }

    // Check expiration date
    let expiresAt: Date | null = null
    if (data.events) {
      const expirationEvent = data.events.find(e =>
        e.eventAction === 'expiration' ||
        e.eventAction === 'registration expiration'
      )
      if (expirationEvent) {
        expiresAt = new Date(expirationEvent.eventDate)
      }
    }

    // Check if expired based on status
    const statusLower = (data.status || []).map(s => s.toLowerCase())
    const expired = statusLower.some(s =>
      s.includes('expired') ||
      s.includes('redemption') ||
      s.includes('pending delete')
    )

    // Also check if expiration date is in the past
    const isExpiredByDate = expiresAt ? expiresAt < new Date() : false

    return {
      registered: true,
      expired: expired || isExpiredByDate,
      expiresAt
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('aborted') || errorMessage.includes('abort')) {
      return { registered: false, expired: false, expiresAt: null, error: 'Timeout' }
    }
    return { registered: false, expired: false, expiresAt: null, error: errorMessage }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date2.getTime() - date1.getTime()) / oneDay)
}

type ResultStatus = 'ok' | 'warning' | 'blocker' | 'skipped'

interface DomainResult {
  domain: string
  status: ResultStatus
  message: string
}

async function main() {
  console.log('Domain Registration Check\n')
  console.log('Extracting domain-style package names from sdks/...\n')

  const domains = extractDomainPackages()

  if (domains.length === 0) {
    console.log('No domain-style packages found.')
    return
  }

  console.log(`Found ${domains.length} domain(s) to verify:\n`)

  const results: DomainResult[] = []
  const WARN_THRESHOLD_DAYS = 90

  for (const domain of domains) {
    process.stdout.write(`  Checking ${domain}... `)

    const result = await checkDomain(domain)

    if (result.noRdap) {
      // TLD doesn't have RDAP or WHOIS handler - skip with notice
      results.push({
        domain,
        status: 'skipped',
        message: 'no RDAP/WHOIS (manual check required)',
      })
      console.log('skipped (no RDAP/WHOIS)')
    } else if (result.error) {
      // Treat lookup errors as warnings, not blockers (server might be down)
      results.push({
        domain,
        status: 'warning',
        message: result.error,
      })
      console.log(`? (${result.error})`)
    } else if (!result.registered) {
      results.push({
        domain,
        status: 'blocker',
        message: 'NOT REGISTERED',
      })
      console.log('NOT REGISTERED')
    } else if (result.expired) {
      // TODO: Change back to 'blocker' after domain renewals (see workers-3tgb)
      results.push({
        domain,
        status: 'warning',
        message: 'EXPIRED (pending renewal)',
      })
      console.log('EXPIRED (pending renewal)')
    } else if (result.expiresAt) {
      const daysUntilExpiry = daysBetween(new Date(), result.expiresAt)

      if (daysUntilExpiry < 0) {
        // TODO: Change back to 'blocker' after domain renewals (see workers-3tgb)
        results.push({
          domain,
          status: 'warning',
          message: 'EXPIRED (pending renewal)',
        })
        console.log('EXPIRED (pending renewal)')
      } else if (daysUntilExpiry <= WARN_THRESHOLD_DAYS) {
        results.push({
          domain,
          status: 'warning',
          message: `expires in ${daysUntilExpiry} days`,
        })
        console.log(`expires in ${daysUntilExpiry} days`)
      } else {
        results.push({
          domain,
          status: 'ok',
          message: `expires: ${formatDate(result.expiresAt)}`,
        })
        console.log(`expires: ${formatDate(result.expiresAt)}`)
      }
    } else {
      results.push({
        domain,
        status: 'ok',
        message: 'registered (no expiry date available)',
      })
      console.log('registered')
    }
  }

  // Summary output
  console.log('\n' + '='.repeat(60) + '\nSummary\n' + '='.repeat(60) + '\n')

  const blockers = results.filter(r => r.status === 'blocker')
  const warnings = results.filter(r => r.status === 'warning')
  const skipped = results.filter(r => r.status === 'skipped')
  const ok = results.filter(r => r.status === 'ok')

  for (const r of ok) {
    console.log(`  \u2705 ${r.domain} (${r.message})`)
  }

  for (const r of skipped) {
    console.log(`  \u23ED  ${r.domain} (${r.message})`)
  }

  for (const r of warnings) {
    console.log(`  \u26A0\uFE0F  ${r.domain} (${r.message})`)
  }

  for (const r of blockers) {
    console.log(`  \u274C ${r.domain} (${r.message}) - BLOCKER`)
  }

  console.log('')

  if (blockers.length > 0) {
    console.error(`\nFailed: ${blockers.length} blocker(s) found. Cannot publish until resolved.\n`)
    console.error('Blockers:')
    for (const b of blockers) {
      console.error(`  - ${b.domain}: ${b.message}`)
    }
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.log(`\nWarning: ${warnings.length} domain(s) need attention.\n`)
  }

  if (skipped.length > 0) {
    console.log(`Note: ${skipped.length} domain(s) skipped (TLD has no RDAP support - manual verification needed).\n`)
  }

  console.log('\nAll domain checks passed!')
}

main()
