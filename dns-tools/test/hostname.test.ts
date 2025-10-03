import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hostnameLookup } from '../src/hostname'

describe('Hostname Lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should perform reverse DNS lookup', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [{ data: 'dns.google', TTL: 3600 }],
        }),
    })

    const result = await hostnameLookup('8.8.8.8')

    expect(result.ip).toBe('8.8.8.8')
    expect(result.hostnames).toHaveLength(1)
    expect(result.primary).toBe('dns.google')
    expect(result.error).toBeUndefined()
  })

  it('should convert IPv4 to reverse domain', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      expect(url).toContain('8.8.8.8.in-addr.arpa')
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [{ data: 'dns.google', TTL: 3600 }],
          }),
      })
    })

    await hostnameLookup('8.8.8.8')
  })

  it('should handle invalid IP addresses', async () => {
    const result = await hostnameLookup('invalid')

    expect(result.error).toBe('Invalid IP address format')
    expect(result.hostnames).toHaveLength(0)
  })

  it('should handle DNS lookup errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 3, // NXDOMAIN
          Answer: [],
        }),
    })

    const result = await hostnameLookup('8.8.8.8')

    expect(result.error).toBe('Name error (NXDOMAIN)')
  })
})
