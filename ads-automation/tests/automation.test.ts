/**
 * Ads Automation Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdsAutomationService } from '../src/index'
import type { Env } from '../src/index'
import { RuleType, ConditionOperator, AdPlatform, type AutomationRule, type RuleContext, type OptimizationGoals, type DaypartingSchedule, type PerformanceAlert } from '@dot-do/ads-types'

describe('AdsAutomationService', () => {
  let service: AdsAutomationService
  let mockEnv: Env

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      AUTOMATION_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      } as any,
      AUTOMATION_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      } as any,
      ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
    }

    service = new AdsAutomationService({} as any, mockEnv)
  })

  describe('Rule Management', () => {
    it('should create automation rule', async () => {
      const rule: AutomationRule = {
        name: 'Pause Low ROI Campaigns',
        description: 'Automatically pause campaigns with ROAS < 1.0',
        type: RuleType.PauseCampaign,
        condition: {
          field: 'roas',
          operator: ConditionOperator.LessThan,
          value: 1.0,
          timeWindow: 7,
        },
        action: {
          type: RuleType.PauseCampaign,
          target: 'campaign',
        },
        frequency: 'daily',
        enabled: true,
        priority: 10,
        cooldown: 60,
        maxExecutionsPerDay: 5,
        notifyOnExecution: true,
      }

      const result = await service.createRule(rule)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Pause Low ROI Campaigns')
      expect(result.type).toBe(RuleType.PauseCampaign)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUTOMATION_KV.put).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should update automation rule', async () => {
      const ruleId = 'rule-123'
      const existingRule: AutomationRule = {
        id: ruleId,
        name: 'Old Rule',
        type: RuleType.BidAdjustment,
        condition: {
          field: 'ctr',
          operator: ConditionOperator.LessThan,
          value: 1.0,
        },
        action: {
          type: RuleType.BidAdjustment,
          target: 'campaign',
        },
        frequency: 'hourly',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingRule))

      const updates = {
        name: 'Updated Rule',
        enabled: false,
      }

      const result = await service.updateRule(ruleId, updates)

      expect(result.name).toBe('Updated Rule')
      expect(result.enabled).toBe(false)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUTOMATION_KV.put).toHaveBeenCalled()
    })

    it('should list rules with filters', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          type: RuleType.BidAdjustment,
          condition: '{}',
          action: '{}',
          frequency: 'hourly',
          enabled: 1,
          priority: 10,
          cooldown: 60,
          max_executions_per_day: 10,
          notify_on_execution: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          type: RuleType.PauseCampaign,
          condition: '{}',
          action: '{}',
          frequency: 'daily',
          enabled: 1,
          priority: 5,
          cooldown: 120,
          max_executions_per_day: 5,
          notify_on_execution: 0,
          created_at: '2025-01-02',
          updated_at: '2025-01-02',
        },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRules }),
      })) as any

      const rules = await service.listRules({ enabled: true })

      expect(rules).toHaveLength(2)
      expect(rules[0].name).toBe('Rule 1')
      expect(rules[1].name).toBe('Rule 2')
    })
  })

  describe('Rule Evaluation', () => {
    it('should evaluate rule with GreaterThan condition', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'High CPA Alert',
        type: RuleType.SendAlert,
        condition: {
          field: 'cpa',
          operator: ConditionOperator.GreaterThan,
          value: 50,
        },
        action: {
          type: RuleType.SendAlert,
          target: 'campaign',
        },
        frequency: 'hourly',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.GoogleAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          cpa: 75, // Greater than 50
          roas: 2.5,
        },
      }

      const evaluation = await service.evaluateRule(ruleId, context)

      expect(evaluation.matched).toBe(true)
      expect(evaluation.executionRecommended).toBe(true)
      expect(evaluation.reason).toContain('Condition met')
    })

    it('should evaluate rule with LessThan condition', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Low ROAS Warning',
        type: RuleType.SendAlert,
        condition: {
          field: 'roas',
          operator: ConditionOperator.LessThan,
          value: 1.5,
        },
        action: {
          type: RuleType.SendAlert,
          target: 'campaign',
        },
        frequency: 'daily',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.MetaAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          roas: 1.2, // Less than 1.5
        },
      }

      const evaluation = await service.evaluateRule(ruleId, context)

      expect(evaluation.matched).toBe(true)
    })

    it('should evaluate rule with Between condition', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Optimal CTR Range',
        type: RuleType.SendAlert,
        condition: {
          field: 'ctr',
          operator: ConditionOperator.Between,
          value: [2.0, 5.0],
        },
        action: {
          type: RuleType.SendAlert,
          target: 'campaign',
        },
        frequency: 'daily',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.LinkedInAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          ctr: 3.5, // Between 2.0 and 5.0
        },
      }

      const evaluation = await service.evaluateRule(ruleId, context)

      expect(evaluation.matched).toBe(true)
    })

    it('should not match when condition is not met', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Test Rule',
        type: RuleType.BidAdjustment,
        condition: {
          field: 'conversions',
          operator: ConditionOperator.GreaterThan,
          value: 100,
        },
        action: {
          type: RuleType.BidAdjustment,
          target: 'campaign',
        },
        frequency: 'daily',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.GoogleAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          conversions: 50, // NOT greater than 100
        },
      }

      const evaluation = await service.evaluateRule(ruleId, context)

      expect(evaluation.matched).toBe(false)
      expect(evaluation.executionRecommended).toBe(false)
    })
  })

  describe('Rule Execution', () => {
    it('should execute rule when condition matches', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Pause Campaign',
        type: RuleType.PauseCampaign,
        condition: {
          field: 'roas',
          operator: ConditionOperator.LessThan,
          value: 1.0,
        },
        action: {
          type: RuleType.PauseCampaign,
          target: 'campaign',
          targetIds: ['campaign-123'],
        },
        frequency: 'daily',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.GoogleAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          roas: 0.8, // Less than 1.0
        },
      }

      const execution = await service.executeRule(ruleId, context)

      expect(execution).toBeDefined()
      expect(execution.ruleId).toBe(ruleId)
      expect(execution.status).toBe('success')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUTOMATION_QUEUE.send).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should skip execution when rule is disabled', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Disabled Rule',
        type: RuleType.BidAdjustment,
        condition: {
          field: 'ctr',
          operator: ConditionOperator.LessThan,
          value: 1.0,
        },
        action: {
          type: RuleType.BidAdjustment,
          target: 'campaign',
        },
        frequency: 'hourly',
        enabled: false, // Disabled
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.MetaAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          ctr: 0.5,
        },
      }

      const execution = await service.executeRule(ruleId, context)

      expect(execution.status).toBe('skipped')
    })

    it('should skip execution when condition does not match', async () => {
      const ruleId = 'rule-123'
      const rule: AutomationRule = {
        id: ruleId,
        name: 'Test Rule',
        type: RuleType.BidAdjustment,
        condition: {
          field: 'conversions',
          operator: ConditionOperator.GreaterThan,
          value: 100,
        },
        action: {
          type: RuleType.BidAdjustment,
          target: 'campaign',
        },
        frequency: 'daily',
        enabled: true,
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.AUTOMATION_KV.get = vi.fn().mockResolvedValue(JSON.stringify(rule))

      const context: RuleContext = {
        campaignId: 'campaign-123',
        platform: AdPlatform.GoogleAds,
        dateRange: { from: '2025-01-01', to: '2025-01-07' },
        metrics: {
          conversions: 50, // NOT greater than 100
        },
      }

      const execution = await service.executeRule(ruleId, context)

      expect(execution.status).toBe('skipped')
    })
  })

  describe('Scheduled Actions', () => {
    it('should create scheduled action', async () => {
      const action = {
        name: 'Weekly Budget Review',
        action: {
          type: RuleType.BudgetAdjustment,
          target: 'campaign' as const,
          parameters: { adjustment: 10 },
        },
        schedule: {
          type: 'recurring' as const,
          startDate: '2025-01-01',
          time: '09:00',
          timezone: 'America/Los_Angeles',
          frequency: 'weekly' as const,
          dayOfWeek: 1,
        },
        enabled: true,
      }

      const result = await service.createScheduledAction(action)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Weekly Budget Review')
      expect(result.nextExecutionAt).toBeDefined()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })

  describe('Optimization', () => {
    it('should set optimization goals', async () => {
      const campaignId = 'campaign-123'
      const goals: OptimizationGoals = {
        primary: {
          metric: 'conversions',
          target: 100,
        },
        secondary: [
          { metric: 'roas', target: 3.0 },
          { metric: 'cpa', target: 25 },
        ],
        constraints: {
          maxBid: 10,
          maxDailySpend: 500,
          minROAS: 2.0,
          maxCPA: 30,
        },
      }

      await service.setOptimizationGoals(campaignId, goals)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUTOMATION_KV.put).toHaveBeenCalled()
    })

    it('should get optimization suggestions', async () => {
      const campaignId = 'campaign-123'

      const suggestions = await service.getOptimizationSuggestions(campaignId)

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].type).toBeDefined()
      expect(suggestions[0].suggestion).toBeDefined()
      expect(suggestions[0].estimatedImpact).toBeDefined()
    })
  })

  describe('Dayparting', () => {
    it('should create dayparting schedule', async () => {
      const schedule: DaypartingSchedule = {
        campaignId: 'campaign-123',
        rules: [
          {
            dayOfWeek: [1, 2, 3, 4, 5], // Weekdays
            hourOfDay: [9, 10, 11, 12, 13, 14, 15, 16, 17], // Business hours
            bidAdjustment: 20, // +20%
          },
          {
            dayOfWeek: [0, 6], // Weekend
            hourOfDay: [0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23],
            bidAdjustment: -50, // -50%
          },
        ],
        timezone: 'America/New_York',
        enabled: true,
      }

      await service.createDaypartingSchedule(schedule)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })

  describe('Alerts', () => {
    it('should create performance alert', async () => {
      const alert: PerformanceAlert = {
        campaignId: 'campaign-123',
        metric: 'cpa',
        condition: {
          operator: ConditionOperator.GreaterThan,
          value: 50,
        },
        severity: 'high',
        channels: ['email', 'slack'],
        recipients: ['user@example.com'],
        webhookUrl: 'https://example.com/webhook',
        cooldown: 60,
        enabled: true,
      }

      const alertId = await service.createPerformanceAlert(alert)

      expect(alertId).toBeDefined()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })

  describe('Workflows', () => {
    it('should create approval workflow', async () => {
      const workflow = {
        name: 'Budget Approval',
        type: 'budget' as const,
        rules: [
          {
            condition: 'budget > 1000',
            approvers: ['manager@example.com', 'director@example.com'],
            required: 2,
            autoApproveAfter: 24,
          },
        ],
        notifications: {
          channels: ['email' as const],
          recipients: ['team@example.com'],
        },
        enabled: true,
      }

      const result = await service.createApprovalWorkflow(workflow)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Budget Approval')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })

  describe('Rollbacks', () => {
    it('should create rollback', async () => {
      const changeId = 'change-123'
      const reason = 'Performance degradation detected'
      const previousState = {
        bid: 5.0,
        budget: 100,
      }

      const rollback = await service.createRollback(changeId, reason, previousState, 'automatic')

      expect(rollback).toBeDefined()
      expect(rollback.id).toBeDefined()
      expect(rollback.changeId).toBe(changeId)
      expect(rollback.reason).toBe(reason)
      expect(rollback.triggeredBy).toBe('automatic')
      expect(rollback.success).toBe(true)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.AUTOMATION_QUEUE.send).toHaveBeenCalled()
    })
  })
})
