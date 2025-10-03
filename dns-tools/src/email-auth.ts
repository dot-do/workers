/**
 * Email Authentication - SPF, DKIM, DMARC
 * Generate and validate email authentication records
 */

import type { Env, SPFRecord, DKIMRecord, DMARCRecord, EmailAuthValidation } from './types'

/**
 * Generate SPF record
 */
export function generateSPFRecord(config: {
  ipv4?: string[]
  ipv6?: string[]
  includes?: string[] // e.g., ['_spf.google.com', 'sendgrid.net']
  a?: boolean
  mx?: boolean
  mechanism?: 'all' | 'ip4' | 'ip6' | 'a' | 'mx' | 'ptr' | 'exists' | 'include'
  qualifier?: '~' | '-' | '?' | '+' // ~all (softfail), -all (fail), ?all (neutral), +all (pass)
}): SPFRecord {
  const parts: string[] = ['v=spf1']

  // Include a record
  if (config.a) parts.push('a')

  // Include MX records
  if (config.mx) parts.push('mx')

  // IPv4 addresses
  if (config.ipv4 && config.ipv4.length > 0) {
    config.ipv4.forEach((ip) => parts.push(`ip4:${ip}`))
  }

  // IPv6 addresses
  if (config.ipv6 && config.ipv6.length > 0) {
    config.ipv6.forEach((ip) => parts.push(`ip6:${ip}`))
  }

  // Include other domains
  if (config.includes && config.includes.length > 0) {
    config.includes.forEach((domain) => parts.push(`include:${domain}`))
  }

  // Final mechanism (default ~all for softfail)
  const qualifier = config.qualifier || '~'
  parts.push(`${qualifier}all`)

  const record = parts.join(' ')

  return {
    record,
    valid: true,
    domain: '',
    mechanisms: parts,
    qualifier: qualifier === '~' ? 'softfail' : qualifier === '-' ? 'fail' : qualifier === '?' ? 'neutral' : 'pass',
  }
}

/**
 * Validate SPF record
 */
export async function validateSPFRecord(domain: string): Promise<SPFRecord> {
  try {
    // Fetch TXT records via DNS
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`)
    const data: any = await response.json()

    if (data.Answer) {
      const spfRecords = data.Answer.filter((r: any) => r.data.includes('v=spf1')).map((r: any) => r.data.replace(/"/g, ''))

      if (spfRecords.length === 0) {
        return {
          record: '',
          valid: false,
          error: 'No SPF record found',
          domain,
          mechanisms: [],
          qualifier: 'none',
        }
      }

      if (spfRecords.length > 1) {
        return {
          record: spfRecords[0],
          valid: false,
          error: 'Multiple SPF records found (RFC violation)',
          domain,
          mechanisms: [],
          qualifier: 'none',
        }
      }

      const record = spfRecords[0]
      const mechanisms = record.split(' ')
      const lastMechanism = mechanisms[mechanisms.length - 1]

      let qualifier: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' = 'none'
      if (lastMechanism.includes('~all')) qualifier = 'softfail'
      else if (lastMechanism.includes('-all')) qualifier = 'fail'
      else if (lastMechanism.includes('?all')) qualifier = 'neutral'
      else if (lastMechanism.includes('+all')) qualifier = 'pass'

      // Check for common issues
      const issues: string[] = []
      if (mechanisms.length > 10) issues.push('Too many DNS lookups (>10)')
      if (record.length > 255) issues.push('Record too long (>255 chars)')

      return {
        record,
        valid: issues.length === 0,
        domain,
        mechanisms,
        qualifier,
        error: issues.length > 0 ? issues.join(', ') : undefined,
      }
    }

    return {
      record: '',
      valid: false,
      error: 'No DNS response',
      domain,
      mechanisms: [],
      qualifier: 'none',
    }
  } catch (error: any) {
    return {
      record: '',
      valid: false,
      error: error.message,
      domain,
      mechanisms: [],
      qualifier: 'none',
    }
  }
}

/**
 * Generate DKIM key pair and DNS record
 */
export async function generateDKIMRecord(config: { domain: string; selector?: string; keySize?: 1024 | 2048 }): Promise<DKIMRecord> {
  const selector = config.selector || 'default'
  const keySize = config.keySize || 2048

  // Generate RSA key pair (in production, use Web Crypto API)
  // For now, return a placeholder structure
  const publicKey = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...` // Placeholder
  const privateKey = `-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----` // Placeholder

  // Format DNS TXT record
  const dnsRecord = `v=DKIM1; k=rsa; p=${publicKey}`

  return {
    domain: config.domain,
    selector,
    publicKey,
    privateKey,
    dnsRecord,
    dnsName: `${selector}._domainkey.${config.domain}`,
    valid: true,
  }
}

/**
 * Validate DKIM record
 */
export async function validateDKIMRecord(domain: string, selector: string = 'default'): Promise<DKIMRecord> {
  try {
    const dnsName = `${selector}._domainkey.${domain}`
    const response = await fetch(`https://dns.google/resolve?name=${dnsName}&type=TXT`)
    const data: any = await response.json()

    if (data.Answer && data.Answer.length > 0) {
      const record = data.Answer[0].data.replace(/"/g, '')

      if (!record.includes('v=DKIM1')) {
        return {
          domain,
          selector,
          publicKey: '',
          privateKey: '',
          dnsRecord: record,
          dnsName,
          valid: false,
          error: 'Invalid DKIM record (missing v=DKIM1)',
        }
      }

      // Extract public key
      const match = record.match(/p=([A-Za-z0-9+/=]+)/)
      const publicKey = match ? match[1] : ''

      return {
        domain,
        selector,
        publicKey,
        privateKey: '',
        dnsRecord: record,
        dnsName,
        valid: true,
      }
    }

    return {
      domain,
      selector,
      publicKey: '',
      privateKey: '',
      dnsRecord: '',
      dnsName,
      valid: false,
      error: 'No DKIM record found',
    }
  } catch (error: any) {
    return {
      domain,
      selector,
      publicKey: '',
      privateKey: '',
      dnsRecord: '',
      dnsName: `${selector}._domainkey.${domain}`,
      valid: false,
      error: error.message,
    }
  }
}

/**
 * Generate DMARC policy
 */
export function generateDMARCRecord(config: {
  domain: string
  policy: 'none' | 'quarantine' | 'reject'
  subdomainPolicy?: 'none' | 'quarantine' | 'reject'
  percentage?: number // 0-100
  rua?: string[] // Aggregate report email addresses
  ruf?: string[] // Forensic report email addresses
  adkim?: 'r' | 's' // relaxed or strict DKIM alignment
  aspf?: 'r' | 's' // relaxed or strict SPF alignment
}): DMARCRecord {
  const parts: string[] = ['v=DMARC1']

  // Policy
  parts.push(`p=${config.policy}`)

  // Subdomain policy
  if (config.subdomainPolicy) {
    parts.push(`sp=${config.subdomainPolicy}`)
  }

  // Percentage (for gradual rollout)
  if (config.percentage !== undefined && config.percentage !== 100) {
    parts.push(`pct=${config.percentage}`)
  }

  // Aggregate reports
  if (config.rua && config.rua.length > 0) {
    parts.push(`rua=${config.rua.map((email) => `mailto:${email}`).join(',')}`)
  }

  // Forensic reports
  if (config.ruf && config.ruf.length > 0) {
    parts.push(`ruf=${config.ruf.map((email) => `mailto:${email}`).join(',')}`)
  }

  // DKIM alignment
  if (config.adkim) {
    parts.push(`adkim=${config.adkim}`)
  }

  // SPF alignment
  if (config.aspf) {
    parts.push(`aspf=${config.aspf}`)
  }

  const record = parts.join('; ')

  return {
    domain: config.domain,
    record,
    policy: config.policy,
    subdomainPolicy: config.subdomainPolicy || config.policy,
    percentage: config.percentage || 100,
    rua: config.rua || [],
    ruf: config.ruf || [],
    valid: true,
  }
}

/**
 * Validate DMARC record
 */
export async function validateDMARCRecord(domain: string): Promise<DMARCRecord> {
  try {
    const dnsName = `_dmarc.${domain}`
    const response = await fetch(`https://dns.google/resolve?name=${dnsName}&type=TXT`)
    const data: any = await response.json()

    if (data.Answer && data.Answer.length > 0) {
      const record = data.Answer[0].data.replace(/"/g, '')

      if (!record.includes('v=DMARC1')) {
        return {
          domain,
          record,
          policy: 'none',
          subdomainPolicy: 'none',
          percentage: 100,
          rua: [],
          ruf: [],
          valid: false,
          error: 'Invalid DMARC record (missing v=DMARC1)',
        }
      }

      // Parse record
      const parts = record.split(';').map((p) => p.trim())
      const parsed: Record<string, string> = {}
      parts.forEach((part) => {
        const [key, value] = part.split('=')
        if (key && value) parsed[key.trim()] = value.trim()
      })

      const policy = (parsed.p as 'none' | 'quarantine' | 'reject') || 'none'
      const subdomainPolicy = (parsed.sp as 'none' | 'quarantine' | 'reject') || policy
      const percentage = parsed.pct ? parseInt(parsed.pct) : 100
      const rua = parsed.rua ? parsed.rua.split(',').map((r) => r.replace('mailto:', '')) : []
      const ruf = parsed.ruf ? parsed.ruf.split(',').map((r) => r.replace('mailto:', '')) : []

      return {
        domain,
        record,
        policy,
        subdomainPolicy,
        percentage,
        rua,
        ruf,
        valid: true,
      }
    }

    return {
      domain,
      record: '',
      policy: 'none',
      subdomainPolicy: 'none',
      percentage: 100,
      rua: [],
      ruf: [],
      valid: false,
      error: 'No DMARC record found',
    }
  } catch (error: any) {
    return {
      domain,
      record: '',
      policy: 'none',
      subdomainPolicy: 'none',
      percentage: 100,
      rua: [],
      ruf: [],
      valid: false,
      error: error.message,
    }
  }
}

/**
 * Validate all email authentication (SPF + DKIM + DMARC)
 */
export async function validateEmailAuth(domain: string, dkimSelector?: string): Promise<EmailAuthValidation> {
  const [spf, dkim, dmarc] = await Promise.all([validateSPFRecord(domain), validateDKIMRecord(domain, dkimSelector), validateDMARCRecord(domain)])

  const score = (spf.valid ? 33 : 0) + (dkim.valid ? 33 : 0) + (dmarc.valid ? 34 : 0)

  const issues: string[] = []
  if (!spf.valid) issues.push(`SPF: ${spf.error}`)
  if (!dkim.valid) issues.push(`DKIM: ${dkim.error}`)
  if (!dmarc.valid) issues.push(`DMARC: ${dmarc.error}`)

  let recommendation = ''
  if (score === 100) {
    recommendation = 'Email authentication is properly configured'
  } else if (score >= 67) {
    recommendation = 'Email authentication is partially configured. Review issues and complete setup'
  } else {
    recommendation = 'Email authentication is not configured. Set up SPF, DKIM, and DMARC records'
  }

  return {
    domain,
    spf,
    dkim,
    dmarc,
    score,
    valid: score === 100,
    issues,
    recommendation,
  }
}
