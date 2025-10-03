import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipLookup, ipLookupBatch } from '../src/ip'
import type { Env } from '../src/types'

const mockEnv: Env = {
  ENVIRONMENT: 'test',
  IPINFO_TOKEN: 'test_token',
}

describe('IP Lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should lookup IP information', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ip: '8.8.8.8',
          hostname: 'dns.google',
          city: 'Mountain View',
          region: 'California',
          country: 'US',
          loc: '37.4056,-122.0775',
          org: 'AS15169 Google LLC',
          postal: '94043',
          timezone: 'America/Los_Angeles',
        }),
    })

    const result = await ipLookup('8.8.8.8', mockEnv)

    expect(result.ip).toBe('8.8.8.8')
    expect(result.hostname).toBe('dns.google')
    expect(result.city).toBe('Mountain View')
    expect(result.countryCode).toBe('US')
    expect(result.asn).toBe('AS15169')
    expect(result.asnName).toBe('Google LLC')
    expect(result.latitude).toBeCloseTo(37.4056)
    expect(result.longitude).toBeCloseTo(-122.0775)
    expect(result.error).toBeUndefined()
  })

  it('should handle missing API token', async () => {
    const envNoToken: Env = {
      ENVIRONMENT: 'test',
    }

    const result = await ipLookup('8.8.8.8', envNoToken)

    expect(result.error).toBe('IPinfo API token not configured')
  })

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const result = await ipLookup('8.8.8.8', mockEnv)

    expect(result.error).toContain('IPinfo API failed')
  })

  it('should batch lookup IPs', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const ip = url.includes('8.8.8.8') ? '8.8.8.8' : '1.1.1.1'
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ip,
            country: 'US',
          }),
      })
    })

    const ips = ['8.8.8.8', '1.1.1.1']
    const results = await ipLookupBatch(ips, mockEnv)

    expect(results).toHaveLength(2)
    expect(results[0].ip).toBe('8.8.8.8')
    expect(results[1].ip).toBe('1.1.1.1')
  })
})
