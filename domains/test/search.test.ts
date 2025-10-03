import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Registrar } from 'domains.do'
import type { Env } from '../src/types'
import { searchPorkbun } from '../src/registrars/porkbun'
import { searchDynadot } from '../src/registrars/dynadot'
import { getAIBuilderPreferredTLDs, getRecommendedRegistrar } from '../src/registrars/tldlist'

describe('Porkbun Integration', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = {
      PORKBUN_API_KEY: 'test_porkbun_key',
      PORKBUN_SECRET_KEY: 'test_porkbun_secret',
      DB: { set: vi.fn() },
      PIPELINE: {},
      ctx: { waitUntil: vi.fn() } as any,
    }
  })

  it('should search domain and return pricing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          pricing: {
            com: {
              registration: 9.68,
              renewal: 9.68,
              transfer: 9.68,
              special: false,
            },
          },
        }),
    })

    const result = await searchPorkbun('example.com', mockEnv)

    expect(result.registrar).toBe(Registrar.Porkbun)
    expect(result.domain).toBe('example.com')
    expect(result.price).toBe(9.68)
    expect(result.premium).toBe(false)
  })

  it('should handle unsupported TLDs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ pricing: {} }),
    })

    const result = await searchPorkbun('example.xyz', mockEnv)

    expect(result.available).toBe(false)
    expect(result.error).toContain('not supported')
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await searchPorkbun('example.com', mockEnv)

    expect(result.available).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Dynadot Integration', () => {
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = {
      DYNADOT_KEY: 'test_dynadot_key',
      DB: { set: vi.fn() },
      PIPELINE: {},
      ctx: { waitUntil: vi.fn() } as any,
    }
  })

  it('should search domain using Dynadot API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          SearchResponse: {
            ResponseCode: '0',
            SearchResults: [
              {
                Domain: 'example.com',
                Available: 'yes',
                Price: '11.99',
                Type: 'standard',
              },
            ],
          },
        }),
    })

    const result = await searchDynadot('example.com', mockEnv)

    expect(result.registrar).toBe(Registrar.Dynadot)
    expect(result.available).toBe(true)
    expect(result.price).toBe(11.99)
    expect(result.premium).toBe(false)
  })

  it('should require API key', async () => {
    const envWithoutKey = { ...mockEnv, DYNADOT_KEY: undefined }
    const result = await searchDynadot('example.com', envWithoutKey)

    expect(result.available).toBe(false)
    expect(result.error).toContain('not configured')
  })
})

describe('TLD Utilities', () => {
  it('should return AI builder preferred TLDs', () => {
    const tlds = getAIBuilderPreferredTLDs()

    expect(tlds).toContain('dev')
    expect(tlds).toContain('app')
    expect(tlds).toContain('ai')
    expect(tlds).toContain('com')
    expect(tlds.length).toBeGreaterThan(5)
  })

  it('should recommend Porkbun for .dev', () => {
    const registrar = getRecommendedRegistrar('dev')
    expect(registrar).toBe(Registrar.Porkbun)
  })

  it('should recommend Porkbun for .app', () => {
    const registrar = getRecommendedRegistrar('app')
    expect(registrar).toBe(Registrar.Porkbun)
  })

  it('should recommend Dynadot for .ai', () => {
    const registrar = getRecommendedRegistrar('ai')
    expect(registrar).toBe(Registrar.Dynadot)
  })

  it('should default to Porkbun for unknown TLDs', () => {
    const registrar = getRecommendedRegistrar('unknown')
    expect(registrar).toBe(Registrar.Porkbun)
  })
})
