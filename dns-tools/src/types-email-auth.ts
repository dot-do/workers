/**
 * Email Authentication Types (SPF, DKIM, DMARC)
 */

/**
 * SPF Record
 */
export interface SPFRecord {
  record: string // Full SPF record string
  valid: boolean
  domain: string
  mechanisms: string[] // e.g., ['v=spf1', 'a', 'mx', 'ip4:192.0.2.1', '~all']
  qualifier: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none'
  error?: string
}

/**
 * DKIM Record
 */
export interface DKIMRecord {
  domain: string
  selector: string
  publicKey: string
  privateKey: string // Only returned on generation, not validation
  dnsRecord: string // Full TXT record value
  dnsName: string // e.g., "default._domainkey.example.com"
  valid: boolean
  error?: string
}

/**
 * DMARC Record
 */
export interface DMARCRecord {
  domain: string
  record: string // Full DMARC record string
  policy: 'none' | 'quarantine' | 'reject'
  subdomainPolicy: 'none' | 'quarantine' | 'reject'
  percentage: number // 0-100
  rua: string[] // Aggregate report email addresses
  ruf: string[] // Forensic report email addresses
  valid: boolean
  error?: string
}

/**
 * Complete Email Authentication Validation
 */
export interface EmailAuthValidation {
  domain: string
  spf: SPFRecord
  dkim: DKIMRecord
  dmarc: DMARCRecord
  score: number // 0-100
  valid: boolean
  issues: string[]
  recommendation: string
}
