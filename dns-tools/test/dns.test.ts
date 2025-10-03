import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dnsLookup, dnsLookupAll } from '../src/dns'

describe('DNS Lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should lookup A record', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ data: '93.184.215.14', TTL: 3600 }],
        }),
    })

    const result = await dnsLookup('example.com', 'A')

    expect(result.domain).toBe('example.com')
    expect(result.recordType).toBe('A')
    expect(result.records).toHaveLength(1)
    expect(result.records[0].value).toBe('93.184.215.14')
    expect(result.records[0].ttl).toBe(3600)
    expect(result.error).toBeUndefined()
  })

  it('should lookup MX record with priority', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ data: '10 mail.example.com', TTL: 3600 }],
        }),
    })

    const result = await dnsLookup('example.com', 'MX')

    expect(result.records).toHaveLength(1)
    expect(result.records[0].priority).toBe(10)
    expect(result.records[0].value).toBe('mail.example.com')
  })

  it('should handle DNS errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 3, // NXDOMAIN
          Answer: [],
        }),
    })

    const result = await dnsLookup('nonexistent.example.com', 'A')

    expect(result.error).toBe('Name error (NXDOMAIN)')
    expect(result.records).toHaveLength(0)
  })

  it('should lookup all record types', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ data: '93.184.215.14', TTL: 3600 }],
        }),
    })

    const results = await dnsLookupAll('example.com')

    expect(results.A).toBeDefined()
    expect(results.AAAA).toBeDefined()
    expect(results.MX).toBeDefined()
    expect(results.NS).toBeDefined()
    expect(results.TXT).toBeDefined()
  })
})
