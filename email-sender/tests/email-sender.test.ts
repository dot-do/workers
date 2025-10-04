import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailSenderService } from '../src/index'
import type { SendEmailRequest, BulkSendRequest } from '../src/types'

describe('EmailSenderService', () => {
  let service: EmailSenderService
  let env: any

  beforeEach(() => {
    env = {
      ENVIRONMENT: 'test',
      ESP_GATEWAY: {
        send: vi.fn().mockResolvedValue({
          success: true,
          messageId: 'msg-test-123',
          provider: 'test-esp',
          message: 'Sent successfully',
        }),
      },
      EMAIL_VALIDATION: {
        bulkValidate: vi.fn().mockResolvedValue({
          results: [
            {
              email: 'test@example.com',
              valid: true,
              score: 100,
              issues: [],
            },
          ],
        }),
      },
      DNS_TOOLS: {},
      DB: {
        query: vi.fn().mockResolvedValue([
          {
            id: 'domain-123',
            limits: {
              hourly: 100,
              daily: 1000,
            },
            warmup: {
              enabled: false,
              status: 'completed',
            },
          },
        ]),
        insert: vi.fn().mockResolvedValue(true),
      },
      EMAIL_SENDER_KV: {
        get: vi.fn().mockResolvedValue('0'),
        put: vi.fn().mockResolvedValue(undefined),
      },
      EMAIL_SEND_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      },
    }

    service = new EmailSenderService({} as any, env)
  })

  describe('send', () => {
    it('should send a single email successfully', async () => {
      const request: SendEmailRequest = {
        to: 'recipient@example.com',
        from: {
          email: 'sender@yourdomain.com',
          name: 'Test Sender',
        },
        subject: 'Test Email',
        html: '<p>Test body</p>',
        text: 'Test body',
      }

      const result = await service.send(request)

      expect(result.success).toBe(true)
      expect(result.status).toBe('sent')
      expect(result.messageId).toBe('msg-test-123')
      expect(result.provider).toBe('test-esp')
      expect(env.ESP_GATEWAY.send).toHaveBeenCalled()
    })

    it('should validate recipients when requested', async () => {
      const request: SendEmailRequest = {
        to: 'recipient@example.com',
        from: { email: 'sender@yourdomain.com' },
        subject: 'Test',
        html: '<p>Test</p>',
        options: {
          validateRecipients: true,
        },
      }

      await service.send(request)

      expect(env.EMAIL_VALIDATION.bulkValidate).toHaveBeenCalledWith(['recipient@example.com'])
    })

    it('should reject invalid recipients', async () => {
      env.EMAIL_VALIDATION.bulkValidate.mockResolvedValue({
        results: [
          {
            email: 'invalid@example.com',
            valid: false,
            score: 0,
            issues: [{ type: 'syntax', message: 'Invalid syntax' }],
          },
        ],
      })

      const request: SendEmailRequest = {
        to: 'invalid@example.com',
        from: { email: 'sender@yourdomain.com' },
        subject: 'Test',
        html: '<p>Test</p>',
        options: {
          validateRecipients: true,
          skipInvalid: false,
        },
      }

      const result = await service.send(request)

      expect(result.success).toBe(false)
      expect(result.status).toBe('rejected')
      expect(result.error).toBe('Invalid recipients')
    })

    it('should queue email when rate limit reached', async () => {
      env.EMAIL_SENDER_KV.get.mockResolvedValue('100') // At hourly limit

      const request: SendEmailRequest = {
        to: 'recipient@example.com',
        from: { email: 'sender@yourdomain.com' },
        subject: 'Test',
        html: '<p>Test</p>',
        options: {
          domainId: 'domain-123',
        },
      }

      const result = await service.send(request)

      expect(result.status).toBe('queued')
      expect(env.EMAIL_SEND_QUEUE.send).toHaveBeenCalled()
    })

    it('should schedule email when requested', async () => {
      const request: SendEmailRequest = {
        to: 'recipient@example.com',
        from: { email: 'sender@yourdomain.com' },
        subject: 'Test',
        html: '<p>Test</p>',
        options: {
          scheduledAt: '2025-10-04T09:00:00Z',
          timezone: 'America/New_York',
        },
      }

      const result = await service.send(request)

      expect(result.status).toBe('scheduled')
      expect(result.scheduledAt).toBe('2025-10-04T09:00:00Z')
      expect(env.DB.insert).toHaveBeenCalledWith('scheduled_emails', expect.any(Object))
    })

    it('should handle multiple recipients', async () => {
      const request: SendEmailRequest = {
        to: ['user1@example.com', 'user2@example.com'],
        from: { email: 'sender@yourdomain.com' },
        subject: 'Test',
        html: '<p>Test</p>',
      }

      const result = await service.send(request)

      expect(result.success).toBe(true)
      expect(env.ESP_GATEWAY.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        }),
        expect.any(Object)
      )
    })
  })

  describe('bulkSend', () => {
    it('should send multiple emails successfully', async () => {
      const request: BulkSendRequest = {
        emails: [
          {
            to: 'user1@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 1',
            html: '<p>Test 1</p>',
          },
          {
            to: 'user2@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 2',
            html: '<p>Test 2</p>',
          },
        ],
      }

      const result = await service.bulkSend(request)

      expect(result.totalCount).toBe(2)
      expect(result.successCount).toBe(2)
      expect(result.failedCount).toBe(0)
      expect(env.ESP_GATEWAY.send).toHaveBeenCalledTimes(2)
    })

    it('should send emails in parallel when requested', async () => {
      const request: BulkSendRequest = {
        emails: [
          {
            to: 'user1@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 1',
            html: '<p>Test 1</p>',
          },
          {
            to: 'user2@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 2',
            html: '<p>Test 2</p>',
          },
        ],
        options: {
          parallel: true,
        },
      }

      const result = await service.bulkSend(request)

      expect(result.successCount).toBe(2)
      expect(env.ESP_GATEWAY.send).toHaveBeenCalledTimes(2)
    })

    it('should continue on error when requested', async () => {
      env.ESP_GATEWAY.send
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to send',
        })
        .mockResolvedValueOnce({
          success: true,
          messageId: 'msg-456',
          provider: 'test-esp',
        })

      const request: BulkSendRequest = {
        emails: [
          {
            to: 'user1@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 1',
            html: '<p>Test 1</p>',
          },
          {
            to: 'user2@example.com',
            from: { email: 'sender@yourdomain.com' },
            subject: 'Test 2',
            html: '<p>Test 2</p>',
          },
        ],
        options: {
          continueOnError: true,
        },
      }

      const result = await service.bulkSend(request)

      expect(result.totalCount).toBe(2)
      expect(result.successCount).toBe(1)
      expect(result.failedCount).toBe(1)
    })

    it('should process in batches', async () => {
      const emails = Array.from({ length: 250 }, (_, i) => ({
        to: `user${i}@example.com`,
        from: { email: 'sender@yourdomain.com' },
        subject: `Test ${i}`,
        html: `<p>Test ${i}</p>`,
      }))

      const request: BulkSendRequest = {
        emails,
        options: {
          batchSize: 100,
        },
      }

      const result = await service.bulkSend(request)

      expect(result.totalCount).toBe(250)
      expect(result.successCount).toBe(250)
    })
  })

  describe('getStatus', () => {
    it('should query send status', async () => {
      env.DB.query.mockResolvedValue([
        {
          message_id: 'msg-123',
          from_email: 'sender@yourdomain.com',
          to_email: 'recipient@example.com',
          subject: 'Test',
          status: 'delivered',
          provider: 'sendgrid',
          sent_at: '2025-10-03T12:00:00Z',
          delivered_at: '2025-10-03T12:01:00Z',
        },
      ])

      const result = await service.getStatus({
        messageId: 'msg-123',
      })

      expect(result).toHaveLength(1)
      expect(result[0].messageId).toBe('msg-123')
      expect(result[0].status).toBe('delivered')
    })
  })

  describe('getStats', () => {
    it('should calculate sending statistics', async () => {
      env.DB.query.mockResolvedValue([
        {
          total_sent: '100',
          total_delivered: '95',
          total_bounced: '2',
          total_opened: '40',
          total_clicked: '10',
          total_replied: '5',
          total_failed: '3',
          provider: 'sendgrid',
          domain_id: 'domain-123',
        },
      ])

      const result = await service.getStats('2025-10-03', 'domain-123')

      expect(result.totalSent).toBe(100)
      expect(result.totalDelivered).toBe(95)
      expect(result.deliveryRate).toBeCloseTo(95.0)
      expect(result.openRate).toBeCloseTo(42.1)
    })
  })
})
