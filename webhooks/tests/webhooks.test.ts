import { describe, it, expect, beforeEach, vi } from 'vitest'
import app from '../src/index'
import type { Env } from '../src/types'

// Helper to type JSON responses
async function getJSON(res: Response): Promise<any> {
  return await res.json()
}

describe('Webhooks Service', () => {
  let env: Env
  let mockDB: any
  let mockQueue: any

  beforeEach(() => {
    // Mock database
    mockDB = {
      query: vi.fn().mockResolvedValue({ rows: [], columns: [] }),
    }

    // Mock queue
    mockQueue = {
      enqueue: vi.fn().mockResolvedValue(undefined),
    }

    env = {
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      WORKOS_API_KEY: 'wk_test_123',
      WORKOS_WEBHOOK_SECRET: 'whsec_test_123',
      GITHUB_WEBHOOK_SECRET: 'ghsec_test_123',
      RESEND_WEBHOOK_SECRET: 'whsec_test_123',
      DB: mockDB,
      QUEUE: mockQueue,
    }
  })

  describe('Health Check', () => {
    it('should return service status', async () => {
      const req = new Request('http://localhost/')
      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        service: 'webhooks',
        status: 'healthy',
        providers: expect.arrayContaining(['stripe', 'workos', 'github', 'resend']),
      })
    })
  })

  describe('Stripe Webhooks', () => {
    it('should reject webhook without signature', async () => {
      const req = new Request('http://localhost/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(401)
      expect(data.error).toBe('Missing stripe-signature header')
    })

    it('should handle idempotent webhooks', async () => {
      // Mock existing event
      mockDB.query.mockResolvedValueOnce({
        rows: [{ id: '123' }],
        columns: [],
      })

      const payload = JSON.stringify({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      })

      const signature = await generateStripeSignature(payload, env.STRIPE_WEBHOOK_SECRET)

      const req = new Request('http://localhost/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body: payload,
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data.already_processed).toBe(true)
    })
  })

  describe('WorkOS Webhooks', () => {
    it('should reject webhook without signature', async () => {
      const req = new Request('http://localhost/workos', {
        method: 'POST',
        body: JSON.stringify({ event: 'dsync.activated' }),
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(401)
      expect(data.error).toBe('Missing workos-signature header')
    })
  })

  describe('GitHub Webhooks', () => {
    it('should reject webhook without signature', async () => {
      const req = new Request('http://localhost/github', {
        method: 'POST',
        body: JSON.stringify({ action: 'opened' }),
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(401)
      expect(data.error).toContain('Missing required GitHub webhook headers')
    })

    it('should handle push event', async () => {
      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        before: 'abc123',
        after: 'def456',
        repository: {
          id: 123,
          name: 'test-repo',
          full_name: 'org/test-repo',
        },
        pusher: {
          name: 'test-user',
          email: 'test@example.com',
        },
        commits: [
          {
            id: 'def456',
            message: 'Test commit',
            timestamp: '2025-10-02T00:00:00Z',
            author: {
              name: 'test-user',
              email: 'test@example.com',
            },
          },
        ],
      })

      const signature = await generateGitHubSignature(payload, env.GITHUB_WEBHOOK_SECRET)

      const req = new Request('http://localhost/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'x-github-delivery': 'delivery-123',
        },
        body: payload,
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data.processed).toBe(true)
      expect(mockDB.query).toHaveBeenCalled()
      expect(mockQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'github.deploy',
        })
      )
    })
  })

  describe('Resend Webhooks', () => {
    it('should handle email.sent event', async () => {
      const payload = JSON.stringify({
        id: 'email-123',
        type: 'email.sent',
        created_at: '2025-10-02T00:00:00Z',
        data: {
          email_id: 'email-123',
          from: 'noreply@example.com',
          to: ['user@example.com'],
          subject: 'Test Email',
          created_at: '2025-10-02T00:00:00Z',
        },
      })

      const timestamp = Math.floor(Date.now() / 1000)
      const signature = await generateSvixSignature(payload, 'email-123', timestamp, env.RESEND_WEBHOOK_SECRET)

      const req = new Request('http://localhost/resend', {
        method: 'POST',
        headers: {
          'svix-id': 'email-123',
          'svix-timestamp': timestamp.toString(),
          'svix-signature': `v1,${signature}`,
        },
        body: payload,
      })

      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data.processed).toBe(true)
      expect(mockDB.query).toHaveBeenCalled()
    })
  })

  describe('Event Management', () => {
    it('should list webhook events', async () => {
      mockDB.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            provider: 'stripe',
            event_id: 'evt_123',
            event_type: 'payment_intent.succeeded',
            processed: true,
          },
        ],
        columns: [],
      })

      const req = new Request('http://localhost/events?provider=stripe')
      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data.events).toHaveLength(1)
      expect(data.events[0].provider).toBe('stripe')
    })

    it('should get event by ID', async () => {
      mockDB.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            provider: 'stripe',
            event_id: 'evt_123',
            event_type: 'payment_intent.succeeded',
          },
        ],
        columns: [],
      })

      const req = new Request('http://localhost/events/stripe/evt_123')
      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(200)
      expect(data.event_id).toBe('evt_123')
    })

    it('should return 404 for non-existent event', async () => {
      mockDB.query.mockResolvedValueOnce({
        rows: [],
        columns: [],
      })

      const req = new Request('http://localhost/events/stripe/evt_999')
      const res = await app.fetch(req, env)
      const data = await getJSON(res)

      expect(res.status).toBe(404)
      expect(data.error).toBe('Event not found')
    })
  })
})

// Helper functions to generate signatures for testing

async function generateStripeSignature(payload: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `t=${timestamp},v1=${signature}`
}

async function generateGitHubSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `sha256=${signature}`
}

async function generateSvixSignature(payload: string, msgId: string, timestamp: number, secret: string): Promise<string> {
  const signedContent = `${msgId}.${timestamp}.${payload}`

  // Remove whsec_ prefix if present
  const secretBytes = base64ToBytes(secret.startsWith('whsec_') ? secret.slice(6) : secret)

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent))

  return bytesToBase64(new Uint8Array(signatureBuffer))
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  return btoa(binaryString)
}
