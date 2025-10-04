/**
 * Known DNSBL Services
 * Comprehensive list of DNS-based blacklist services
 */

import type { Blacklist } from './types'

/**
 * Major blacklist providers
 */
export const BLACKLISTS: Blacklist[] = [
  // Spamhaus - Industry standard, high authority
  {
    name: 'Spamhaus ZEN',
    dnsbl: 'zen.spamhaus.org',
    type: 'both',
    authority: 'high',
    description: 'Combined list of SBL, XBL, and PBL',
    website: 'https://www.spamhaus.org/zen/',
  },
  {
    name: 'Spamhaus SBL',
    dnsbl: 'sbl.spamhaus.org',
    type: 'ip',
    authority: 'high',
    description: 'Spamhaus Block List - known spam sources',
    website: 'https://www.spamhaus.org/sbl/',
  },
  {
    name: 'Spamhaus XBL',
    dnsbl: 'xbl.spamhaus.org',
    type: 'ip',
    authority: 'high',
    description: 'Exploits Block List - compromised systems',
    website: 'https://www.spamhaus.org/xbl/',
  },
  {
    name: 'Spamhaus DBL',
    dnsbl: 'dbl.spamhaus.org',
    type: 'domain',
    authority: 'high',
    description: 'Domain Block List - known spam domains',
    website: 'https://www.spamhaus.org/dbl/',
  },

  // Barracuda - High authority
  {
    name: 'Barracuda',
    dnsbl: 'b.barracudacentral.org',
    type: 'ip',
    authority: 'high',
    description: 'Barracuda Reputation Block List',
    website: 'https://barracudacentral.org/rbl',
  },

  // SORBS - Comprehensive blacklist
  {
    name: 'SORBS',
    dnsbl: 'dnsbl.sorbs.net',
    type: 'ip',
    authority: 'medium',
    description: 'Spam and Open Relay Blocking System',
    website: 'https://www.sorbs.net/',
  },

  // SpamCop - Widely used
  {
    name: 'SpamCop',
    dnsbl: 'bl.spamcop.net',
    type: 'ip',
    authority: 'medium',
    description: 'SpamCop Blocking List',
    website: 'https://www.spamcop.net/bl.shtml',
  },

  // URIBL - Domain/URL blacklist
  {
    name: 'URIBL',
    dnsbl: 'multi.uribl.com',
    type: 'domain',
    authority: 'medium',
    description: 'URI Blacklist - domains found in spam',
    website: 'https://uribl.com/',
  },

  // SURBL - URL blacklist
  {
    name: 'SURBL',
    dnsbl: 'multi.surbl.org',
    type: 'domain',
    authority: 'medium',
    description: 'Spam URI Realtime Blocklists',
    website: 'https://www.surbl.org/',
  },

  // Invaluement - IP reputation
  {
    name: 'Invaluement',
    dnsbl: 'dnsbl.invaluement.com',
    type: 'ip',
    authority: 'medium',
    description: 'Invaluement Anti-Spam DNSBL',
    website: 'https://www.invaluement.com/',
  },

  // PSBL - Passive spam block list
  {
    name: 'PSBL',
    dnsbl: 'psbl.surriel.com',
    type: 'ip',
    authority: 'low',
    description: 'Passive Spam Block List',
    website: 'https://psbl.org/',
  },

  // Mailspike - Reputation service
  {
    name: 'Mailspike',
    dnsbl: 'bl.mailspike.net',
    type: 'ip',
    authority: 'medium',
    description: 'Mailspike Blacklist',
    website: 'https://mailspike.net/',
  },

  // RATS DNSBL
  {
    name: 'RATS-Dyna',
    dnsbl: 'dyna.spamrats.com',
    type: 'ip',
    authority: 'low',
    description: 'RATS Dynamic IP blacklist',
    website: 'https://www.spamrats.com/',
  },
  {
    name: 'RATS-NoPtr',
    dnsbl: 'noptr.spamrats.com',
    type: 'ip',
    authority: 'low',
    description: 'RATS No PTR blacklist',
    website: 'https://www.spamrats.com/',
  },

  // Nordspam
  {
    name: 'Nordspam',
    dnsbl: 'dnsbl.nordspam.com',
    type: 'ip',
    authority: 'low',
    description: 'Nordspam Blacklist',
    website: 'https://www.nordspam.com/',
  },
]

/**
 * Get high-authority blacklists (recommended for critical checks)
 */
export function getHighAuthorityBlacklists(): Blacklist[] {
  return BLACKLISTS.filter((bl) => bl.authority === 'high')
}

/**
 * Get IP blacklists
 */
export function getIPBlacklists(): Blacklist[] {
  return BLACKLISTS.filter((bl) => bl.type === 'ip' || bl.type === 'both')
}

/**
 * Get domain blacklists
 */
export function getDomainBlacklists(): Blacklist[] {
  return BLACKLISTS.filter((bl) => bl.type === 'domain' || bl.type === 'both')
}

/**
 * Get blacklist by name
 */
export function getBlacklistByName(name: string): Blacklist | undefined {
  return BLACKLISTS.find((bl) => bl.name.toLowerCase() === name.toLowerCase() || bl.dnsbl === name)
}
