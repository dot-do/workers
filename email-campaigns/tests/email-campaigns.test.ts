import { describe, it, expect, beforeEach } from 'vitest'
import { EmailCampaignsService } from '../src/index'
import type { Env, CampaignConfig } from '../src/types'

describe('Email Campaigns Service', () => {
  let service: EmailCampaignsService
  let env: Env

  const mockDB = {
    execute: async (query: string, params?: any[]) => {
      // Mock database responses
      if (query.includes('INSERT INTO email_campaigns')) {
        return { rows: [], success: true }
      }
      if (query.includes('SELECT * FROM email_campaigns WHERE id')) {
        return {
          rows: [
            {
              id: 'test-campaign-id',
              name: 'Test Campaign',
              description: 'Test Description',
              domain_id: 'test-domain',
              status: 'draft',
              sequences: JSON.stringify([
                {
                  id: 'step-1',
                  order: 0,
                  delay: 0,
                  subject: 'Hello {{firstName}}',
                  html: '<p>Hi {{firstName}}</p>',
                  trackOpens: true,
                  trackClicks: true,
                },
              ]),
              targeting: JSON.stringify({ contactIds: ['contact-1', 'contact-2'] }),
              schedule: null,
              unsubscribe_url: null,
              metadata: JSON.stringify({}),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              started_at: null,
              completed_at: null,
            },
          ],
          success: true,
        }
      }
      return { rows: [], success: true }
    },
  }

  beforeEach(() => {
    env = {
      DB: mockDB,
      EMAIL_SENDER: null as any,
      EMAIL: null as any,
      KV: null as any,
      CAMPAIGN_QUEUE: null as any,
      ENVIRONMENT: 'test',
    }
    service = new EmailCampaignsService({} as any, env)
  })

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const config: CampaignConfig = {
        name: 'Test Campaign',
        description: 'Test Description',
        domainId: 'test-domain',
        sequences: [
          {
            id: 'step-1',
            order: 0,
            delay: 0,
            subject: 'Hello {{firstName}}',
            html: '<p>Hi {{firstName}}</p>',
            trackOpens: true,
            trackClicks: true,
          },
        ],
        targeting: {
          contactIds: ['contact-1', 'contact-2'],
        },
      }

      const result = await service.createCampaign({ config })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Test Campaign')
      expect(result.status).toBe('draft')
      expect(result.sequences).toHaveLength(1)
    })

    it('should validate campaign config', async () => {
      const invalidConfig = {
        name: '', // Invalid: empty name
        domainId: 'test-domain',
        sequences: [],
        targeting: {},
      }

      await expect(service.createCampaign({ config: invalidConfig as any })).rejects.toThrow()
    })
  })

  describe('getCampaign', () => {
    it('should get campaign by ID', async () => {
      const result = await service.getCampaign('test-campaign-id')

      expect(result).toBeDefined()
      expect(result?.id).toBe('test-campaign-id')
      expect(result?.name).toBe('Test Campaign')
      expect(result?.status).toBe('draft')
    })

    it('should return null for non-existent campaign', async () => {
      env.DB = {
        execute: async () => ({ rows: [], success: true }),
      }
      service = new EmailCampaignsService({} as any, env)

      const result = await service.getCampaign('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('listCampaigns', () => {
    it('should list campaigns with pagination', async () => {
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('COUNT(*)')) {
            return { rows: [{ count: 5 }], success: true }
          }
          return {
            rows: [
              {
                id: 'campaign-1',
                name: 'Campaign 1',
                domain_id: 'domain-1',
                status: 'active',
                sequences: JSON.stringify([]),
                targeting: JSON.stringify({}),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            success: true,
          }
        },
      }
      service = new EmailCampaignsService({} as any, env)

      const result = await service.listCampaigns({ limit: 10, offset: 0 })

      expect(result).toBeDefined()
      expect(result.campaigns).toHaveLength(1)
      expect(result.total).toBe(5)
      expect(result.hasMore).toBe(true)
    })
  })

  describe('startCampaign', () => {
    it('should start a draft campaign', async () => {
      const mockQueue = {
        send: async (message: any) => {
          expect(message.type).toBe('process_campaign')
          expect(message.campaignId).toBe('test-campaign-id')
        },
      }
      env.CAMPAIGN_QUEUE = mockQueue as any

      const result = await service.startCampaign({ id: 'test-campaign-id' })

      expect(result.status).toBe('active')
      expect(result.startedAt).toBeDefined()
    })

    it('should schedule campaign for future start', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const result = await service.startCampaign({
        id: 'test-campaign-id',
        startAt: futureDate,
      })

      expect(result.status).toBe('scheduled')
      expect(result.startedAt).toBe(futureDate)
    })
  })

  describe('pauseCampaign', () => {
    it('should pause an active campaign', async () => {
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT')) {
            return {
              rows: [
                {
                  id: 'test-campaign-id',
                  name: 'Test Campaign',
                  domain_id: 'test-domain',
                  status: 'active', // Active status
                  sequences: JSON.stringify([]),
                  targeting: JSON.stringify({}),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
              success: true,
            }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailCampaignsService({} as any, env)

      const result = await service.pauseCampaign({ id: 'test-campaign-id' })

      expect(result.status).toBe('paused')
    })
  })

  describe('getCampaignStats', () => {
    it('should calculate campaign statistics', async () => {
      env.DB = {
        execute: async (query: string) => {
          if (query.includes('SELECT * FROM email_campaigns')) {
            return {
              rows: [
                {
                  id: 'test-campaign-id',
                  name: 'Test Campaign',
                  domain_id: 'test-domain',
                  status: 'active',
                  sequences: JSON.stringify([
                    {
                      id: 'step-1',
                      order: 0,
                      delay: 0,
                      subject: 'Test',
                      html: '<p>Test</p>',
                    },
                  ]),
                  targeting: JSON.stringify({}),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
              success: true,
            }
          }
          if (query.includes('GROUP BY status')) {
            return {
              rows: [
                { status: 'pending', count: 50 },
                { status: 'sent', count: 30 },
                { status: 'replied', count: 10 },
              ],
              success: true,
            }
          }
          if (query.includes('COUNT(*) as sent')) {
            return {
              rows: [
                {
                  sent: 40,
                  delivered: 38,
                  opened: 20,
                  clicked: 10,
                  replied: 10,
                  bounced: 2,
                  failed: 0,
                },
              ],
              success: true,
            }
          }
          return { rows: [], success: true }
        },
      }
      service = new EmailCampaignsService({} as any, env)

      const result = await service.getCampaignStats({ id: 'test-campaign-id' })

      expect(result).toBeDefined()
      expect(result.campaignId).toBe('test-campaign-id')
      expect(result.contacts.total).toBe(90)
      expect(result.emails.sent).toBe(40)
      expect(result.rates.openRate).toBeGreaterThan(0)
      expect(result.rates.clickRate).toBeGreaterThan(0)
    })
  })
})
