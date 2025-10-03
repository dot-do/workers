/**
 * DNS Tools - Type Definitions
 * Comprehensive DNS, IP, ASN, and WHOIS lookup types
 */

export interface Env {
  // Environment variables
  ENVIRONMENT: string
  WHOISXML_API_KEY?: string
  IPINFO_TOKEN?: string

  // Service bindings
  DB?: any
}

/**
 * DNS Record Types
 */
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'PTR' | 'CAA' | 'SRV'

/**
 * DNS Lookup Result
 */
export interface DNSLookupResult {
  domain: string
  recordType: DNSRecordType
  records: DNSRecord[]
  responseTime: number
  cached: boolean
  error?: string
}

export interface DNSRecord {
  type: DNSRecordType
  value: string
  ttl?: number
  priority?: number // MX records
  weight?: number // SRV records
  port?: number // SRV records
  target?: string // SRV records
}

/**
 * IP Lookup Result (Geolocation)
 */
export interface IPLookupResult {
  ip: string
  hostname?: string
  city?: string
  region?: string
  country: string
  countryCode: string
  continent?: string
  continentCode?: string
  latitude?: number
  longitude?: number
  timezone?: string
  postalCode?: string
  org?: string
  asn?: string
  asnName?: string
  provider?: string
  responseTime: number
  cached: boolean
  error?: string
}

/**
 * ASN Lookup Result
 */
export interface ASNLookupResult {
  asn: string
  name: string
  description?: string
  countryCode: string
  registryDate?: string
  routes?: string[]
  prefixes?: IPPrefix[]
  organization?: string
  email?: string
  responseTime: number
  cached: boolean
  error?: string
}

export interface IPPrefix {
  prefix: string
  description?: string
}

/**
 * Hostname/Reverse DNS Lookup Result
 */
export interface HostnameLookupResult {
  ip: string
  hostnames: string[]
  primary?: string
  responseTime: number
  cached: boolean
  error?: string
}

/**
 * WHOIS Lookup Result
 */
export interface WHOISLookupResult {
  domain: string
  registrar?: string
  registrant?: WHOISContact
  admin?: WHOISContact
  tech?: WHOISContact
  nameservers?: string[]
  status?: string[]
  createdDate?: string
  updatedDate?: string
  expiresDate?: string
  dnssec?: boolean
  rawText?: string
  responseTime: number
  cached: boolean
  error?: string
}

export interface WHOISContact {
  name?: string
  organization?: string
  email?: string
  phone?: string
  fax?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  countryCode?: string
}

/**
 * Unified Lookup Request
 */
export interface LookupRequest {
  type: 'dns' | 'ip' | 'asn' | 'hostname' | 'whois'
  target: string // domain, IP, ASN number, etc.
  recordType?: DNSRecordType // For DNS lookups
  useCache?: boolean
}

/**
 * Unified Lookup Response
 */
export type LookupResponse = DNSLookupResult | IPLookupResult | ASNLookupResult | HostnameLookupResult | WHOISLookupResult

/**
 * Bulk Lookup Request
 */
export interface BulkLookupRequest {
  lookups: LookupRequest[]
  parallel?: boolean
}

export interface BulkLookupResponse {
  results: LookupResponse[]
  totalTime: number
  successCount: number
  errorCount: number
}

/**
 * Email Authentication Types (SPF, DKIM, DMARC)
 */

export interface SPFRecord {
  record: string
  valid: boolean
  domain: string
  mechanisms: string[]
  qualifier: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none'
  error?: string
}

export interface DKIMRecord {
  domain: string
  selector: string
  publicKey: string
  privateKey: string
  dnsRecord: string
  dnsName: string
  valid: boolean
  error?: string
}

export interface DMARCRecord {
  domain: string
  record: string
  policy: 'none' | 'quarantine' | 'reject'
  subdomainPolicy: 'none' | 'quarantine' | 'reject'
  percentage: number
  rua: string[]
  ruf: string[]
  valid: boolean
  error?: string
}

export interface EmailAuthValidation {
  domain: string
  spf: SPFRecord
  dkim: DKIMRecord
  dmarc: DMARCRecord
  score: number
  valid: boolean
  issues: string[]
  recommendation: string
}
