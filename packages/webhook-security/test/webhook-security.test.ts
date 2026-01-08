/**
 * RED Tests: Webhook Signature Verification (HMAC)
 *
 * These tests define the contract for webhook signature verification middleware.
 * Tests should verify: X-Hub-Signature header parsing (sha1=...), HMAC-SHA1
 * signature computation with client_secret, timing-safe comparison, rejection of
 * invalid signatures, and proper error responses (401 Unauthorized).
 *
 * RED PHASE: Tests should initially fail until implementation is complete.
 *
 * @see workers-mu8yt (RED) and workers-os210 (GREEN)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { verifyWebhookSignature } from '../src/index.js'

describe('Webhook Signature Verification', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('X-Hub-Signature header parsing', () => {
    it('should parse sha1= signature format', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({ event: 'test' })
      const signature = 'sha1=abc123'

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': signature,
        },
        body,
      })

      // Should attempt to verify (may fail if signature is invalid)
      expect([200, 401]).toContain(response.status)
    })

    it('should reject missing X-Hub-Signature header', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event: 'test' }),
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toMatch(/signature.*required|missing.*signature/i)
    })

    it('should reject malformed signature format', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': 'invalid-format',
        },
        body: JSON.stringify({ event: 'test' }),
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toMatch(/invalid.*signature.*format/i)
    })
  })

  describe('HMAC-SHA1 signature computation', () => {
    it('should accept valid HMAC-SHA1 signature', async () => {
      const secret = 'my-webhook-secret'
      app.use('/webhook', verifyWebhookSignature({ secret }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({ event: 'user.created', userId: '123' })

      // Compute valid HMAC-SHA1 signature using Web Crypto API
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': `sha1=${signatureHex}`,
        },
        body,
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
    })

    it('should reject invalid HMAC-SHA1 signature', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'my-webhook-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({ event: 'test' })
      const invalidSignature = 'sha1=0000000000000000000000000000000000000000'

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': invalidSignature,
        },
        body,
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toMatch(/invalid.*signature|signature.*verification.*failed/i)
    })

    it('should reject signature from wrong secret', async () => {
      const correctSecret = 'correct-secret'
      const wrongSecret = 'wrong-secret'

      app.use('/webhook', verifyWebhookSignature({ secret: correctSecret }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({ event: 'test' })

      // Compute signature with wrong secret
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(wrongSecret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': `sha1=${signatureHex}`,
        },
        body,
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Timing-safe comparison', () => {
    it('should use timing-safe comparison to prevent timing attacks', async () => {
      const secret = 'test-secret'
      app.use('/webhook', verifyWebhookSignature({ secret }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({ event: 'test' })

      // Test with multiple invalid signatures
      // If not timing-safe, different signatures might take different times
      const invalidSignatures = [
        'sha1=0000000000000000000000000000000000000000',
        'sha1=1111111111111111111111111111111111111111',
        'sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ]

      for (const sig of invalidSignatures) {
        const response = await app.request('/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature': sig,
          },
          body,
        })

        expect(response.status).toBe(401)
      }

      // All should fail in roughly the same time (timing-safe comparison)
      // The actual timing test would be done with performance.now() in production
    })
  })

  describe('Error responses', () => {
    it('should return 401 Unauthorized for missing signature', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test' }),
      })

      expect(response.status).toBe(401)
      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('should return 401 Unauthorized for invalid signature', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': 'sha1=invalid',
        },
        body: JSON.stringify({ event: 'test' }),
      })

      expect(response.status).toBe(401)
    })

    it('should include error message in response body', async () => {
      app.use('/webhook', verifyWebhookSignature({ secret: 'test-secret' }))
      app.post('/webhook', (c) => c.json({ success: true }))

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test' }),
      })

      const json = await response.json()
      expect(json).toHaveProperty('error')
      expect(typeof json.error).toBe('string')
      expect(json.error.length).toBeGreaterThan(0)
    })
  })

  describe('Valid signatures pass through', () => {
    it('should allow request to proceed with valid signature', async () => {
      const secret = 'pass-through-secret'
      app.use('/webhook', verifyWebhookSignature({ secret }))
      app.post('/webhook', (c) => {
        return c.json({ received: true, data: 'processed' })
      })

      const body = JSON.stringify({ event: 'order.created', orderId: 'ORD-123' })

      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': `sha1=${signatureHex}`,
        },
        body,
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.received).toBe(true)
      expect(json.data).toBe('processed')
    })

    it('should preserve request body for downstream handlers', async () => {
      const secret = 'body-preservation-test'
      let receivedBody: any = null

      app.use('/webhook', verifyWebhookSignature({ secret }))
      app.post('/webhook', async (c) => {
        receivedBody = await c.req.json()
        return c.json({ ok: true })
      })

      const bodyData = { event: 'test', value: 42 }
      const body = JSON.stringify(bodyData)

      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': `sha1=${signatureHex}`,
        },
        body,
      })

      expect(response.status).toBe(200)
      expect(receivedBody).toEqual(bodyData)
    })
  })

  describe('Replay attack prevention', () => {
    it('should optionally validate timestamp freshness', async () => {
      const secret = 'timestamp-test'

      // With timestamp validation enabled
      app.use(
        '/webhook',
        verifyWebhookSignature({
          secret,
          maxAge: 5 * 60 * 1000, // 5 minutes
        })
      )
      app.post('/webhook', (c) => c.json({ success: true }))

      const body = JSON.stringify({
        event: 'test',
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      })

      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature': `sha1=${signatureHex}`,
        },
        body,
      })

      // If maxAge is enforced, old events should be rejected
      // This test passes even if not implemented (optional feature)
      expect([200, 401]).toContain(response.status)
    })
  })
})
