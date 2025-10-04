/**
 * Ads Automation Engine Worker
 * Rule-based optimization, scheduling, and automated actions
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  RuleType,
  ConditionOperator,
  AdPlatform,
  type AutomationRule,
  type RuleCondition,
  type RuleAction,
  type RuleContext,
  type RuleEvaluation,
  type RuleExecution,
  type ScheduledAction,
  type ActionResult,
  type OptimizationGoals,
  type OptimizationLog,
  type DaypartingSchedule,
  type PerformanceAlert,
  type ApprovalWorkflow,
  type ApprovalRequest,
  type RollbackConfig,
  type Rollback,
} from '@dot-do/ads-types'

/**
 * Environment bindings
 */
export interface Env {
  AUTOMATION_KV: KVNamespace
  DB: D1Database
  AUTOMATION_QUEUE: Queue
  ANALYTICS: AnalyticsEngineDataset
}

/**
 * Ads Automation Service
 */
export class AdsAutomationService extends WorkerEntrypoint<Env> {
  /**
   * Create automation rule
   */
  async createRule(rule: AutomationRule): Promise<AutomationRule> {
    const ruleId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newRule: AutomationRule = {
      ...rule,
      id: ruleId,
      createdAt: now,
      updatedAt: now,
    }

    // Store in D1
    await this.env.DB.prepare(
      `INSERT INTO automation_rules (id, name, description, type, condition, action, frequency, enabled, priority, cooldown, max_executions_per_day, notify_on_execution, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(ruleId, rule.name, rule.description || null, rule.type, JSON.stringify(rule.condition), JSON.stringify(rule.action), rule.frequency, rule.enabled ? 1 : 0, rule.priority || 0, rule.cooldown || 0, rule.maxExecutionsPerDay || 999, rule.notifyOnExecution ? 1 : 0, now, now)
      .run()

    // Cache in KV
    await this.env.AUTOMATION_KV.put(`rule:${ruleId}`, JSON.stringify(newRule), { expirationTtl: 3600 })

    // Track in Analytics
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['rule_created', rule.type, rule.frequency],
      doubles: [1],
      indexes: [ruleId],
    })

    return newRule
  }

  /**
   * Update automation rule
   */
  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    // Get existing rule
    const cached = await this.env.AUTOMATION_KV.get(`rule:${ruleId}`)
    let existingRule: AutomationRule | null = cached ? JSON.parse(cached) : null

    if (!existingRule) {
      const result = await this.env.DB.prepare(`SELECT * FROM automation_rules WHERE id = ?`).bind(ruleId).first()
      if (!result) throw new Error(`Rule not found: ${ruleId}`)
      existingRule = {
        id: result.id as string,
        name: result.name as string,
        description: result.description as string | undefined,
        type: result.type as RuleType,
        condition: JSON.parse(result.condition as string),
        action: JSON.parse(result.action as string),
        frequency: result.frequency as 'continuous' | 'hourly' | 'daily' | 'weekly',
        enabled: result.enabled === 1,
        priority: result.priority as number | undefined,
        cooldown: result.cooldown as number | undefined,
        maxExecutionsPerDay: result.max_executions_per_day as number | undefined,
        notifyOnExecution: result.notify_on_execution === 1,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string,
      }
    }

    const updatedRule: AutomationRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update in D1
    await this.env.DB.prepare(
      `UPDATE automation_rules SET name = ?, description = ?, type = ?, condition = ?, action = ?, frequency = ?, enabled = ?, priority = ?, cooldown = ?, max_executions_per_day = ?, notify_on_execution = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(updatedRule.name, updatedRule.description || null, updatedRule.type, JSON.stringify(updatedRule.condition), JSON.stringify(updatedRule.action), updatedRule.frequency, updatedRule.enabled ? 1 : 0, updatedRule.priority || 0, updatedRule.cooldown || 0, updatedRule.maxExecutionsPerDay || 999, updatedRule.notifyOnExecution ? 1 : 0, updatedRule.updatedAt, ruleId)
      .run()

    // Update cache
    await this.env.AUTOMATION_KV.put(`rule:${ruleId}`, JSON.stringify(updatedRule), { expirationTtl: 3600 })

    return updatedRule
  }

  /**
   * Evaluate rule against context
   */
  async evaluateRule(ruleId: string, context: RuleContext): Promise<RuleEvaluation> {
    // Get rule
    const cached = await this.env.AUTOMATION_KV.get(`rule:${ruleId}`)
    let rule: AutomationRule | null = cached ? JSON.parse(cached) : null

    if (!rule) {
      const result = await this.env.DB.prepare(`SELECT * FROM automation_rules WHERE id = ?`).bind(ruleId).first()
      if (!result) throw new Error(`Rule not found: ${ruleId}`)
      rule = {
        id: result.id as string,
        name: result.name as string,
        type: result.type as RuleType,
        condition: JSON.parse(result.condition as string),
        action: JSON.parse(result.action as string),
        frequency: result.frequency as 'continuous' | 'hourly' | 'daily' | 'weekly',
        enabled: result.enabled === 1,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string,
      }
    }

    // Evaluate condition
    const matched = this.evaluateCondition(rule.condition, context)

    const evaluation: RuleEvaluation = {
      ruleId,
      ruleName: rule.name,
      matched,
      reason: matched ? `Condition met: ${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}` : `Condition not met`,
      executionRecommended: matched && rule.enabled,
    }

    return evaluation
  }

  /**
   * Execute rule
   */
  async executeRule(ruleId: string, context: RuleContext): Promise<RuleExecution> {
    const executionId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get rule
    const cached = await this.env.AUTOMATION_KV.get(`rule:${ruleId}`)
    let rule: AutomationRule | null = cached ? JSON.parse(cached) : null

    if (!rule) {
      const result = await this.env.DB.prepare(`SELECT * FROM automation_rules WHERE id = ?`).bind(ruleId).first()
      if (!result) throw new Error(`Rule not found: ${ruleId}`)
      rule = {
        id: result.id as string,
        name: result.name as string,
        type: result.type as RuleType,
        condition: JSON.parse(result.condition as string),
        action: JSON.parse(result.action as string),
        frequency: result.frequency as 'continuous' | 'hourly' | 'daily' | 'weekly',
        enabled: result.enabled === 1,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string,
      }
    }

    // Check if rule is enabled
    if (!rule.enabled) {
      const execution: RuleExecution = {
        id: executionId,
        ruleId,
        ruleName: rule.name,
        status: 'skipped',
        context,
        action: rule.action,
        executedAt: now,
        completedAt: now,
      }
      return execution
    }

    // Evaluate condition
    const matched = this.evaluateCondition(rule.condition, context)

    if (!matched) {
      const execution: RuleExecution = {
        id: executionId,
        ruleId,
        ruleName: rule.name,
        status: 'skipped',
        context,
        action: rule.action,
        executedAt: now,
        completedAt: now,
      }
      return execution
    }

    // Execute action
    const execution: RuleExecution = {
      id: executionId,
      ruleId,
      ruleName: rule.name,
      status: 'executing',
      context,
      action: rule.action,
      executedAt: now,
    }

    // Store execution record
    await this.env.DB.prepare(
      `INSERT INTO rule_executions (id, rule_id, rule_name, status, context, action, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(executionId, ruleId, rule.name, execution.status, JSON.stringify(context), JSON.stringify(rule.action), now)
      .run()

    // Queue action for execution
    await this.env.AUTOMATION_QUEUE.send({ type: 'execute_action', executionId, ruleId, action: rule.action, context })

    // Track in Analytics
    this.env.ANALYTICS.writeDataPoint({
      blobs: ['rule_executed', rule.type, context.platform],
      doubles: [1],
      indexes: [ruleId],
    })

    execution.status = 'success'
    execution.completedAt = new Date().toISOString()

    return execution
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const fieldValue = context.metrics[condition.field]
    if (fieldValue === undefined) return false

    const targetValue = typeof condition.value === 'number' ? condition.value : parseFloat(condition.value as string)

    switch (condition.operator) {
      case ConditionOperator.Equals:
        return fieldValue === targetValue
      case ConditionOperator.NotEquals:
        return fieldValue !== targetValue
      case ConditionOperator.GreaterThan:
        return fieldValue > targetValue
      case ConditionOperator.GreaterThanOrEqual:
        return fieldValue >= targetValue
      case ConditionOperator.LessThan:
        return fieldValue < targetValue
      case ConditionOperator.LessThanOrEqual:
        return fieldValue <= targetValue
      case ConditionOperator.Between:
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          return fieldValue >= condition.value[0] && fieldValue <= condition.value[1]
        }
        return false
      case ConditionOperator.ChangedBy:
        if (context.previousMetrics && context.previousMetrics[condition.field] !== undefined) {
          const previousValue = context.previousMetrics[condition.field]
          const change = ((fieldValue - previousValue) / previousValue) * 100
          return Math.abs(change) >= Math.abs(targetValue)
        }
        return false
      default:
        return false
    }
  }

  /**
   * List rules with filters
   */
  async listRules(filters?: { enabled?: boolean; type?: RuleType; platform?: AdPlatform }): Promise<AutomationRule[]> {
    let query = `SELECT * FROM automation_rules WHERE 1=1`
    const params: any[] = []

    if (filters?.enabled !== undefined) {
      query += ` AND enabled = ?`
      params.push(filters.enabled ? 1 : 0)
    }

    if (filters?.type) {
      query += ` AND type = ?`
      params.push(filters.type)
    }

    query += ` ORDER BY priority DESC, created_at DESC`

    const result = await this.env.DB.prepare(query).bind(...params).all()

    return result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      condition: JSON.parse(row.condition),
      action: JSON.parse(row.action),
      frequency: row.frequency,
      enabled: row.enabled === 1,
      priority: row.priority,
      cooldown: row.cooldown,
      maxExecutionsPerDay: row.max_executions_per_day,
      notifyOnExecution: row.notify_on_execution === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Create scheduled action
   */
  async createScheduledAction(action: Omit<ScheduledAction, 'id' | 'nextExecutionAt' | 'createdAt'>): Promise<ScheduledAction> {
    const actionId = crypto.randomUUID()
    const now = new Date().toISOString()
    const nextExecution = this.calculateNextExecution(action.schedule, now)

    const scheduledAction: ScheduledAction = {
      ...action,
      id: actionId,
      nextExecutionAt: nextExecution,
      createdAt: now,
    }

    await this.env.DB.prepare(
      `INSERT INTO scheduled_actions (id, name, action, schedule, enabled, next_execution_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(actionId, action.name, JSON.stringify(action.action), JSON.stringify(action.schedule), action.enabled ? 1 : 0, nextExecution, now)
      .run()

    return scheduledAction
  }

  /**
   * Calculate next execution time
   */
  private calculateNextExecution(schedule: ScheduledAction['schedule'], fromDate: string): string {
    const now = new Date(fromDate)
    const [hours, minutes] = schedule.time.split(':').map(Number)

    if (schedule.type === 'once') {
      const scheduledDate = new Date(schedule.startDate)
      scheduledDate.setHours(hours, minutes, 0, 0)
      return scheduledDate.toISOString()
    }

    // Recurring schedule
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)

    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    return next.toISOString()
  }

  /**
   * Set optimization goals
   */
  async setOptimizationGoals(campaignId: string, goals: OptimizationGoals): Promise<void> {
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO optimization_goals (campaign_id, primary_metric, primary_target, secondary_goals, constraints, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(campaignId, goals.primary.metric, goals.primary.target, JSON.stringify(goals.secondary || []), JSON.stringify(goals.constraints || {}), new Date().toISOString())
      .run()

    await this.env.AUTOMATION_KV.put(`goals:${campaignId}`, JSON.stringify(goals), { expirationTtl: 3600 })
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(campaignId: string): Promise<Array<{ type: string; suggestion: string; estimatedImpact: number }>> {
    // Mock suggestions based on campaign performance
    const suggestions = [
      { type: 'bid', suggestion: 'Increase bid by 15% for high-performing keywords', estimatedImpact: 12.5 },
      { type: 'budget', suggestion: 'Reallocate 20% budget to top-performing ad groups', estimatedImpact: 18.3 },
      { type: 'targeting', suggestion: 'Expand audience to similar demographics', estimatedImpact: 8.7 },
      { type: 'creative', suggestion: 'Test new ad copy variant based on winners', estimatedImpact: 15.2 },
    ]

    return suggestions
  }

  /**
   * Create dayparting schedule
   */
  async createDaypartingSchedule(schedule: DaypartingSchedule): Promise<void> {
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO dayparting_schedules (campaign_id, rules, timezone, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(schedule.campaignId, JSON.stringify(schedule.rules), schedule.timezone, schedule.enabled ? 1 : 0, new Date().toISOString())
      .run()
  }

  /**
   * Create performance alert
   */
  async createPerformanceAlert(alert: PerformanceAlert): Promise<string> {
    const alertId = crypto.randomUUID()

    await this.env.DB.prepare(
      `INSERT INTO performance_alerts (id, campaign_id, metric, condition, severity, channels, recipients, webhook_url, cooldown, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(alertId, alert.campaignId, alert.metric, JSON.stringify(alert.condition), alert.severity, JSON.stringify(alert.channels), JSON.stringify(alert.recipients), alert.webhookUrl || null, alert.cooldown || 60, alert.enabled ? 1 : 0, new Date().toISOString())
      .run()

    return alertId
  }

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(workflow: Omit<ApprovalWorkflow, 'id'>): Promise<ApprovalWorkflow> {
    const workflowId = crypto.randomUUID()

    const newWorkflow: ApprovalWorkflow = {
      ...workflow,
      id: workflowId,
    }

    await this.env.DB.prepare(
      `INSERT INTO approval_workflows (id, name, type, rules, notifications, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(workflowId, workflow.name, workflow.type, JSON.stringify(workflow.rules), JSON.stringify(workflow.notifications), workflow.enabled ? 1 : 0, new Date().toISOString())
      .run()

    return newWorkflow
  }

  /**
   * Create rollback
   */
  async createRollback(changeId: string, reason: string, previousState: Record<string, any>, triggeredBy: 'manual' | 'automatic'): Promise<Rollback> {
    const rollbackId = crypto.randomUUID()
    const now = new Date().toISOString()

    const rollback: Rollback = {
      id: rollbackId,
      changeId,
      reason,
      previousState,
      triggeredBy,
      executedAt: now,
      success: true,
    }

    await this.env.DB.prepare(
      `INSERT INTO rollbacks (id, change_id, reason, previous_state, triggered_by, executed_at, success)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(rollbackId, changeId, reason, JSON.stringify(previousState), triggeredBy, now, 1)
      .run()

    // Queue rollback action
    await this.env.AUTOMATION_QUEUE.send({ type: 'rollback', rollbackId, changeId, previousState })

    return rollback
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Rules
app.post('/rules', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const rule = await c.req.json()
  const result = await service.createRule(rule)
  return c.json({ success: true, rule: result })
})

app.get('/rules', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const enabled = c.req.query('enabled') === 'true'
  const type = c.req.query('type') as RuleType | undefined
  const rules = await service.listRules({ enabled, type })
  return c.json({ success: true, rules })
})

app.put('/rules/:id', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const ruleId = c.req.param('id')
  const updates = await c.req.json()
  const result = await service.updateRule(ruleId, updates)
  return c.json({ success: true, rule: result })
})

app.post('/rules/:id/evaluate', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const ruleId = c.req.param('id')
  const context = await c.req.json()
  const evaluation = await service.evaluateRule(ruleId, context)
  return c.json({ success: true, evaluation })
})

app.post('/rules/:id/execute', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const ruleId = c.req.param('id')
  const context = await c.req.json()
  const execution = await service.executeRule(ruleId, context)
  return c.json({ success: true, execution })
})

// Scheduled actions
app.post('/scheduled-actions', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const action = await c.req.json()
  const result = await service.createScheduledAction(action)
  return c.json({ success: true, action: result })
})

// Optimization
app.post('/optimization/goals/:campaignId', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const campaignId = c.req.param('campaignId')
  const goals = await c.req.json()
  await service.setOptimizationGoals(campaignId, goals)
  return c.json({ success: true })
})

app.get('/optimization/suggestions/:campaignId', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const campaignId = c.req.param('campaignId')
  const suggestions = await service.getOptimizationSuggestions(campaignId)
  return c.json({ success: true, suggestions })
})

// Dayparting
app.post('/dayparting', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const schedule = await c.req.json()
  await service.createDaypartingSchedule(schedule)
  return c.json({ success: true })
})

// Alerts
app.post('/alerts', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const alert = await c.req.json()
  const alertId = await service.createPerformanceAlert(alert)
  return c.json({ success: true, alertId })
})

// Workflows
app.post('/workflows', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const workflow = await c.req.json()
  const result = await service.createApprovalWorkflow(workflow)
  return c.json({ success: true, workflow: result })
})

// Rollbacks
app.post('/rollbacks', async (c) => {
  const service = new AdsAutomationService({} as any, c.env)
  const { changeId, reason, previousState, triggeredBy } = await c.req.json()
  const rollback = await service.createRollback(changeId, reason, previousState, triggeredBy)
  return c.json({ success: true, rollback })
})

export default {
  fetch: app.fetch,
}
