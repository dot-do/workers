import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkDomainHealth } from '../src/health'
import type { Env, MonitoringConfig } from '../src/types'

const mockEnv: Env = {
  ENVIRONMENT: 'test',
  ALERT_DAYS_BEFORE_EXPIRY: '30',
  DB: {} as any,
  MONITORING_QUEUE: {} as any,
}

const mockConfig: MonitoringConfig = {
  domain: 'example.com',
  enabled: true,
  checkInterval: 60,
  alerts: {
    enabled: true,
    expirationDays: [30, 14, 7, 1],
    channels: ['slack'],
    recipients: [],
  },
  healthCheck: {
    enabled: true,
    checkDNS: true,
    checkHTTP: true,
    checkHTTPS: true,
    checkSSL: true,
  },
  screenshot: {
    enabled: false,
    compareEnabled: false,
    interval: 24,
  },
}

describe('Domain Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should perform comprehensive health check', async () => {
    // Mock successful responses
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('cloudflare-dns.com')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: 0,
              Answer: [{ data: '93.184.215.14', TTL: 3600 }],
            }),
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Map(),
      })
    })

    const result = await checkDomainHealth('example.com', mockConfig, mockEnv)

    expect(result.domain).toBe('example.com')
    expect(result.checks.dns.status).toBe('pass')
    expect(result.checks.http.status).toBe('pass')
    expect(result.checks.https.status).toBe('pass')
    expect(result.checks.ssl.status).toBe('pass')
    expect(result.overall).toBe('healthy')
    expect(result.issues).toHaveLength(0)
  })

  it('should detect DNS failures', async () => {
    // Mock DNS_TOOLS service to return NXDOMAIN error
    const envWithDNS = {
      ...mockEnv,
      DNS_TOOLS: {
        dns: vi.fn().mockResolvedValue({
          error: 'Name error (NXDOMAIN)',
          records: [],
        }),
      },
    }

    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Map() })

    const result = await checkDomainHealth('nonexistent.example.com', mockConfig, envWithDNS)

    expect(result.checks.dns.status).toBe('fail')
    expect(result.overall).toBe('unhealthy')
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].type).toBe('dns')
    expect(result.issues[0].severity).toBe('critical')
  })

  it('should handle HTTPS failures', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('cloudflare-dns.com')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: 0,
              Answer: [{ data: '93.184.215.14', TTL: 3600 }],
            }),
        })
      }

      if (typeof url === 'string' && url.startsWith('https://')) {
        return Promise.reject(new Error('SSL certificate invalid'))
      }

      return Promise.resolve({ ok: true, status: 200, headers: new Map() })
    })

    const result = await checkDomainHealth('example.com', mockConfig, mockEnv)

    expect(result.checks.https.status).toBe('fail')
    expect(result.overall).toBe('unhealthy')
  })
})
