/**
 * Human Function Channel Router
 *
 * Intelligent routing system for distributing human function executions
 * across multiple channels (Slack, Web, Voice, Email) with:
 * - Priority-based channel selection
 * - Fallback cascade handling
 * - Assignee availability checking
 * - Load balancing across humans
 * - Context-aware routing (time of day, urgency, skillset)
 */

import type {
  HumanFunction,
  HumanChannel,
  ExecutionContext,
  RoutingError as RoutingErrorType,
} from './types'
import { RoutingError } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Routing strategy types
 */
export type RoutingStrategy = 'hash' | 'weighted' | 'random' | 'sticky'

/**
 * Channel health and reliability metrics
 */
export interface ChannelHealth {
  channel: HumanChannel
  available: boolean
  responseTime: number // Average response time in ms
  successRate: number // 0-1
  currentLoad: number // Number of active tasks
  maxLoad: number // Maximum concurrent tasks
  lastChecked: Date
}

/**
 * Assignee availability status
 */
export interface AssigneeAvailability {
  userId: string
  channel: HumanChannel
  available: boolean
  currentLoad: number
  maxLoad: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  lastActive?: Date
}

/**
 * Routing decision with selected channel and assignee
 */
export interface RoutingDecision {
  channel: HumanChannel
  assignee?: string
  fallbackChannels: HumanChannel[]
  strategy: RoutingStrategy
  metadata?: Record<string, unknown>
}

/**
 * Payload sent to a channel
 */
export interface RoutingPayload<TInput = unknown> {
  executionId: string
  functionName: string
  input: TInput
  assignee?: string
  priority?: 1 | 2 | 3 | 4 | 5
  timeout?: number
  metadata?: Record<string, unknown>
}

/**
 * Routing context for decision-making
 */
export interface RoutingContext {
  timeOfDay: number // Hour 0-23
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  urgency: 'low' | 'medium' | 'high' | 'critical'
  requiredSkills?: string[]
  preferredChannel?: HumanChannel
  excludeChannels?: HumanChannel[]
}

/**
 * Routing rules stored in KV
 */
export interface RoutingRule {
  functionName?: string // Apply to specific function, or * for all
  condition?: {
    timeOfDay?: { start: number; end: number }
    dayOfWeek?: number[]
    priority?: number[]
    tags?: string[]
  }
  action: {
    preferChannel?: HumanChannel
    excludeChannels?: HumanChannel[]
    overrideAssignees?: string[]
    overrideTimeout?: number
  }
}

/**
 * Environment bindings for router
 */
export interface RouterEnv {
  // KV for routing rules and availability cache
  ROUTING_KV?: KVNamespace

  // Service bindings for external integrations
  SLACK_API_TOKEN?: string
  WORKOS_API_KEY?: string

  // Queue for async distribution
  HUMAN_QUEUE?: Queue

  // Database for tracking
  DB?: {
    get: (id: string) => Promise<any>
    list: (ns: string, options?: any) => Promise<any>
    upsert: (items: any[], options?: any) => Promise<any>
  }
}

// ============================================================================
// ChannelRouter Class
// ============================================================================

/**
 * Channel Router for intelligent human function distribution
 *
 * @example
 * ```typescript
 * const router = new ChannelRouter(env)
 *
 * // Make routing decision
 * const decision = await router.route(functionDef, input, context)
 *
 * // Send to selected channel
 * const result = await router.sendToChannel(decision.channel, payload)
 *
 * // Or use convenience method
 * const result = await router.routeAndSend(functionDef, input, context)
 * ```
 */
export class ChannelRouter {
  constructor(private env: RouterEnv) {}

  /**
   * Route a human function execution to the optimal channel
   *
   * This is the main entry point for routing decisions. It:
   * 1. Evaluates routing rules from KV
   * 2. Checks assignee availability
   * 3. Selects optimal channel based on strategy
   * 4. Prepares fallback cascade
   *
   * @param functionDef - The human function definition
   * @param input - Input data for the function
   * @param context - Optional routing context for decision-making
   * @returns Routing decision with selected channel and fallbacks
   */
  async route<TInput, TOutput>(
    functionDef: HumanFunction<TInput, TOutput>,
    input: TInput,
    context?: Partial<RoutingContext>
  ): Promise<RoutingDecision> {
    // Build full context
    const fullContext = this.buildContext(context)

    // Apply routing rules
    const rules = await this.getRoutingRules(functionDef.name)
    const applicableRule = this.findApplicableRule(rules, fullContext, functionDef)

    // Get available channels (from function config + rules)
    let availableChannels = [...functionDef.routing.channels]

    if (applicableRule?.action.preferChannel) {
      availableChannels = [applicableRule.action.preferChannel, ...availableChannels]
    }

    if (applicableRule?.action.excludeChannels) {
      availableChannels = availableChannels.filter(
        (c) => !applicableRule.action.excludeChannels?.includes(c)
      )
    }

    if (fullContext.excludeChannels) {
      availableChannels = availableChannels.filter(
        (c) => !fullContext.excludeChannels?.includes(c)
      )
    }

    // Check channel health
    const healthyChannels = await this.getHealthyChannels(availableChannels)

    if (healthyChannels.length === 0) {
      throw new RoutingError('No healthy channels available', {
        availableChannels,
        functionName: functionDef.name,
      })
    }

    // Determine assignees
    const assignees = applicableRule?.action.overrideAssignees || (await this.getAssignees(functionDef, input))

    // Check assignee availability across channels
    const availabilityMap = await this.checkAvailability(assignees, healthyChannels)

    // Select optimal channel based on strategy
    const strategy = this.determineStrategy(functionDef, fullContext)
    const channel = await this.selectChannel(
      healthyChannels,
      availabilityMap,
      strategy,
      input,
      fullContext
    )

    // Select assignee (if multiple available)
    const assignee = await this.selectAssignee(assignees, channel, availabilityMap, strategy)

    // Build fallback cascade
    const fallbackChannels = healthyChannels
      .filter((c) => c !== channel)
      .sort((a, b) => this.compareChannelPriority(a, b, fullContext))

    return {
      channel,
      assignee,
      fallbackChannels,
      strategy,
      metadata: {
        appliedRule: applicableRule?.action,
        context: fullContext,
        healthyChannels: healthyChannels.map((c) => c.channel),
      },
    }
  }

  /**
   * Check if assignees are available on specific channels
   *
   * @param assignees - List of user IDs to check
   * @param channels - List of channels to check
   * @returns Map of assignee->channel->availability
   */
  async checkAvailability(
    assignees: string[],
    channels: ChannelHealth[]
  ): Promise<Map<string, Map<HumanChannel, AssigneeAvailability>>> {
    const availabilityMap = new Map<string, Map<HumanChannel, AssigneeAvailability>>()

    for (const assignee of assignees) {
      const channelMap = new Map<HumanChannel, AssigneeAvailability>()

      for (const channelHealth of channels) {
        const availability = await this.checkAssigneeAvailability(assignee, channelHealth.channel)
        channelMap.set(channelHealth.channel, availability)
      }

      availabilityMap.set(assignee, channelMap)
    }

    return availabilityMap
  }

  /**
   * Check if a specific assignee is available on a channel
   */
  private async checkAssigneeAvailability(
    assignee: string,
    channel: HumanChannel
  ): Promise<AssigneeAvailability> {
    // Check cache first
    const cacheKey = `availability:${assignee}:${channel}`
    const cached = await this.env.ROUTING_KV?.get(cacheKey, { type: 'json' })

    if (cached && typeof cached === 'object' && 'available' in cached) {
      const availability = cached as AssigneeAvailability
      const age = Date.now() - new Date(availability.lastActive || 0).getTime()
      if (age < 60000) {
        // Cache for 1 minute
        return availability
      }
    }

    // Check availability based on channel
    let availability: AssigneeAvailability

    switch (channel) {
      case 'slack':
        availability = await this.checkSlackAvailability(assignee)
        break

      case 'web':
        availability = await this.checkWebAvailability(assignee)
        break

      case 'voice':
        availability = await this.checkVoiceAvailability(assignee)
        break

      case 'email':
        availability = await this.checkEmailAvailability(assignee)
        break

      default:
        availability = {
          userId: assignee,
          channel,
          available: true, // Default to available
          currentLoad: 0,
          maxLoad: 10,
        }
    }

    // Cache result
    await this.env.ROUTING_KV?.put(cacheKey, JSON.stringify(availability), {
      expirationTtl: 60, // 1 minute
    })

    return availability
  }

  /**
   * Check Slack availability using Slack Web API
   */
  private async checkSlackAvailability(userId: string): Promise<AssigneeAvailability> {
    if (!this.env.SLACK_API_TOKEN) {
      return {
        userId,
        channel: 'slack',
        available: false,
        currentLoad: 0,
        maxLoad: 10,
      }
    }

    try {
      // Call Slack API to get user presence
      const response = await fetch('https://slack.com/api/users.getPresence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SLACK_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: userId }),
      })

      const data = await response.json() as { ok: boolean; presence?: string }

      const isActive = data.ok && data.presence === 'active'

      // Get current load from database
      const currentLoad = await this.getCurrentLoad(userId, 'slack')

      return {
        userId,
        channel: 'slack',
        available: isActive && currentLoad < 5, // Max 5 concurrent Slack tasks
        currentLoad,
        maxLoad: 5,
        status: isActive ? 'online' : 'away',
        lastActive: new Date(),
      }
    } catch (error) {
      console.error('Failed to check Slack availability:', error)
      return {
        userId,
        channel: 'slack',
        available: false,
        currentLoad: 0,
        maxLoad: 5,
      }
    }
  }

  /**
   * Check web UI availability (based on active sessions)
   */
  private async checkWebAvailability(userId: string): Promise<AssigneeAvailability> {
    // Check if user has active web session in last 5 minutes
    // This would typically check WorkOS session or custom session store
    const currentLoad = await this.getCurrentLoad(userId, 'web')

    // For web, we assume higher availability
    return {
      userId,
      channel: 'web',
      available: currentLoad < 10,
      currentLoad,
      maxLoad: 10,
      lastActive: new Date(),
    }
  }

  /**
   * Check voice availability (based on phone system)
   */
  private async checkVoiceAvailability(userId: string): Promise<AssigneeAvailability> {
    // Voice has strict availability - only one at a time
    const currentLoad = await this.getCurrentLoad(userId, 'voice')

    return {
      userId,
      channel: 'voice',
      available: currentLoad === 0,
      currentLoad,
      maxLoad: 1, // Only one voice call at a time
      lastActive: new Date(),
    }
  }

  /**
   * Check email availability (always available, but with load limits)
   */
  private async checkEmailAvailability(userId: string): Promise<AssigneeAvailability> {
    const currentLoad = await this.getCurrentLoad(userId, 'email')

    return {
      userId,
      channel: 'email',
      available: currentLoad < 50, // High email capacity
      currentLoad,
      maxLoad: 50,
      lastActive: new Date(),
    }
  }

  /**
   * Get current load (number of active tasks) for assignee on channel
   */
  private async getCurrentLoad(userId: string, channel: HumanChannel): Promise<number> {
    if (!this.env.DB) return 0

    try {
      // Query database for active executions
      const result = await this.env.DB.list('human_executions', {
        filters: {
          assignee: userId,
          channel: channel,
          status: ['pending', 'in_progress'],
        },
      })

      return result?.data?.length || 0
    } catch (error) {
      console.error('Failed to get current load:', error)
      return 0
    }
  }

  /**
   * Send payload to specific channel
   *
   * @param channel - Target channel
   * @param payload - Routing payload
   * @returns Promise resolving when sent
   */
  async sendToChannel<TInput>(channel: HumanChannel, payload: RoutingPayload<TInput>): Promise<void> {
    switch (channel) {
      case 'slack':
        return await this.sendToSlack(payload)

      case 'web':
        return await this.sendToWeb(payload)

      case 'voice':
        return await this.sendToVoice(payload)

      case 'email':
        return await this.sendToEmail(payload)

      default:
        throw new RoutingError(`Unsupported channel: ${channel}`, { channel })
    }
  }

  /**
   * Send to Slack channel
   */
  private async sendToSlack<TInput>(payload: RoutingPayload<TInput>): Promise<void> {
    if (!this.env.SLACK_API_TOKEN) {
      throw new RoutingError('Slack API token not configured', { channel: 'slack' })
    }

    try {
      // Get Slack user ID for assignee
      const slackUserId = payload.assignee || 'UNKNOWN'

      // Open DM channel
      const dmResponse = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SLACK_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: slackUserId }),
      })

      const dmData = await dmResponse.json() as { ok: boolean; channel?: { id: string } }

      if (!dmData.ok || !dmData.channel) {
        throw new Error('Failed to open Slack DM')
      }

      // Send message with interactive blocks
      const blocks = this.buildSlackBlocks(payload)

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SLACK_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: dmData.channel.id,
          blocks,
          text: `New task: ${payload.functionName}`,
        }),
      })
    } catch (error) {
      throw new RoutingError('Failed to send to Slack', {
        channel: 'slack',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Build Slack message blocks
   */
  private buildSlackBlocks<TInput>(payload: RoutingPayload<TInput>): any[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `⚡ New Task: ${payload.functionName}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Execution ID:* \`${payload.executionId}\`\n*Priority:* ${this.priorityToEmoji(payload.priority)}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Input:*\n\`\`\`${JSON.stringify(payload.input, null, 2)}\`\`\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Task' },
            style: 'primary',
            url: `https://app.do.com/human/${payload.executionId}`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Assign to Me' },
            action_id: `assign_${payload.executionId}`,
          },
        ],
      },
    ]
  }

  /**
   * Send to web UI (via queue for real-time updates)
   */
  private async sendToWeb<TInput>(payload: RoutingPayload<TInput>): Promise<void> {
    // Store execution in database
    if (this.env.DB) {
      await this.env.DB.upsert(
        [
          {
            $id: `human_execution/${payload.executionId}`,
            data: {
              ...payload,
              channel: 'web',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          },
        ],
        {
          ns: 'human_executions',
          $context: 'https://human.do',
          type: 'HumanExecution',
          $type: 'HumanExecution',
        }
      )
    }

    // Send to queue for WebSocket notification
    if (this.env.HUMAN_QUEUE) {
      await this.env.HUMAN_QUEUE.send({
        type: 'web_notification',
        payload: {
          executionId: payload.executionId,
          assignee: payload.assignee,
          notification: {
            title: `New task: ${payload.functionName}`,
            body: 'Click to view details',
            url: `/human/${payload.executionId}`,
          },
        },
      })
    }
  }

  /**
   * Send to voice channel (initiate phone call)
   */
  private async sendToVoice<TInput>(payload: RoutingPayload<TInput>): Promise<void> {
    // This would integrate with a voice provider like Twilio, Vapi, etc.
    throw new RoutingError('Voice channel not yet implemented', { channel: 'voice' })
  }

  /**
   * Send to email channel
   */
  private async sendToEmail<TInput>(payload: RoutingPayload<TInput>): Promise<void> {
    // This would integrate with email service (already have email worker)
    if (this.env.HUMAN_QUEUE) {
      await this.env.HUMAN_QUEUE.send({
        type: 'email_notification',
        payload: {
          executionId: payload.executionId,
          assignee: payload.assignee,
          email: {
            subject: `New task: ${payload.functionName}`,
            body: this.buildEmailBody(payload),
          },
        },
      })
    }
  }

  /**
   * Build email body for human function execution
   */
  private buildEmailBody<TInput>(payload: RoutingPayload<TInput>): string {
    return `
You have a new task to complete:

Function: ${payload.functionName}
Execution ID: ${payload.executionId}
Priority: ${payload.priority || 3}

Input:
${JSON.stringify(payload.input, null, 2)}

View and complete this task at:
https://app.do.com/human/${payload.executionId}

${payload.timeout ? `This task must be completed within ${payload.timeout / 1000 / 60} minutes.` : ''}
    `.trim()
  }

  /**
   * Attempt fallback to next channel
   *
   * @param originalChannel - Original channel that failed
   * @param payload - Routing payload
   * @param fallbackChannels - List of fallback channels
   * @returns Promise resolving to the channel used or throwing if all fail
   */
  async fallback<TInput>(
    originalChannel: HumanChannel,
    payload: RoutingPayload<TInput>,
    fallbackChannels: HumanChannel[]
  ): Promise<HumanChannel> {
    console.log(`Falling back from ${originalChannel} to ${fallbackChannels.join(', ')}`)

    for (const channel of fallbackChannels) {
      try {
        await this.sendToChannel(channel, payload)
        return channel
      } catch (error) {
        console.error(`Fallback to ${channel} failed:`, error)
        continue
      }
    }

    throw new RoutingError('All fallback channels failed', {
      originalChannel,
      attemptedChannels: fallbackChannels,
      payload,
    })
  }

  /**
   * Broadcast to multiple channels simultaneously
   *
   * @param channels - List of channels
   * @param payload - Routing payload
   * @returns Promise resolving to map of channel->success
   */
  async broadcast<TInput>(
    channels: HumanChannel[],
    payload: RoutingPayload<TInput>
  ): Promise<Map<HumanChannel, boolean>> {
    const results = new Map<HumanChannel, boolean>()

    await Promise.allSettled(
      channels.map(async (channel) => {
        try {
          await this.sendToChannel(channel, payload)
          results.set(channel, true)
        } catch (error) {
          console.error(`Broadcast to ${channel} failed:`, error)
          results.set(channel, false)
        }
      })
    )

    return results
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Build full routing context
   */
  private buildContext(context?: Partial<RoutingContext>): RoutingContext {
    const now = new Date()

    return {
      timeOfDay: context?.timeOfDay ?? now.getHours(),
      dayOfWeek: context?.dayOfWeek ?? now.getDay(),
      urgency: context?.urgency ?? 'medium',
      requiredSkills: context?.requiredSkills,
      preferredChannel: context?.preferredChannel,
      excludeChannels: context?.excludeChannels,
    }
  }

  /**
   * Get routing rules from KV
   */
  private async getRoutingRules(functionName: string): Promise<RoutingRule[]> {
    if (!this.env.ROUTING_KV) return []

    try {
      const rulesJson = await this.env.ROUTING_KV.get('routing_rules', { type: 'json' })
      return (rulesJson as RoutingRule[]) || []
    } catch (error) {
      console.error('Failed to get routing rules:', error)
      return []
    }
  }

  /**
   * Find applicable routing rule
   */
  private findApplicableRule(
    rules: RoutingRule[],
    context: RoutingContext,
    functionDef: HumanFunction<any, any>
  ): RoutingRule | undefined {
    return rules.find((rule) => {
      // Check function name match
      if (rule.functionName && rule.functionName !== '*' && rule.functionName !== functionDef.name) {
        return false
      }

      // Check conditions
      if (rule.condition) {
        if (
          rule.condition.timeOfDay &&
          (context.timeOfDay < rule.condition.timeOfDay.start ||
            context.timeOfDay > rule.condition.timeOfDay.end)
        ) {
          return false
        }

        if (rule.condition.dayOfWeek && !rule.condition.dayOfWeek.includes(context.dayOfWeek)) {
          return false
        }

        if (
          rule.condition.priority &&
          !rule.condition.priority.includes(functionDef.routing.priority || 3)
        ) {
          return false
        }

        if (
          rule.condition.tags &&
          !rule.condition.tags.some((tag) => functionDef.routing.tags?.includes(tag))
        ) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Get healthy channels
   */
  private async getHealthyChannels(channels: HumanChannel[]): Promise<ChannelHealth[]> {
    // For now, assume all channels are healthy
    // In production, this would check actual health metrics
    return channels.map((channel) => ({
      channel,
      available: true,
      responseTime: 1000,
      successRate: 0.95,
      currentLoad: 0,
      maxLoad: 100,
      lastChecked: new Date(),
    }))
  }

  /**
   * Get assignees for function
   */
  private async getAssignees<TInput, TOutput>(
    functionDef: HumanFunction<TInput, TOutput>,
    input: TInput
  ): Promise<string[]> {
    const { assignees } = functionDef.routing

    if (!assignees) {
      return [] // No specific assignees
    }

    if (typeof assignees === 'function') {
      return await assignees(input)
    }

    return assignees
  }

  /**
   * Determine routing strategy
   */
  private determineStrategy(
    functionDef: HumanFunction<any, any>,
    context: RoutingContext
  ): RoutingStrategy {
    // Critical urgency uses weighted (fastest channel)
    if (context.urgency === 'critical') {
      return 'weighted'
    }

    // Default to hash for consistent routing
    return 'hash'
  }

  /**
   * Select optimal channel based on strategy
   */
  private async selectChannel(
    channels: ChannelHealth[],
    availabilityMap: Map<string, Map<HumanChannel, AssigneeAvailability>>,
    strategy: RoutingStrategy,
    input: unknown,
    context: RoutingContext
  ): Promise<HumanChannel> {
    switch (strategy) {
      case 'hash':
        return this.selectChannelHash(channels, input)

      case 'weighted':
        return this.selectChannelWeighted(channels, availabilityMap)

      case 'random':
        return this.selectChannelRandom(channels)

      case 'sticky':
        return this.selectChannelSticky(channels, input)

      default:
        return channels[0].channel
    }
  }

  /**
   * Hash-based deterministic channel selection
   */
  private selectChannelHash(channels: ChannelHealth[], input: unknown): HumanChannel {
    const hash = this.hashInput(input)
    const index = hash % channels.length
    return channels[index].channel
  }

  /**
   * Weighted selection based on response time and success rate
   */
  private selectChannelWeighted(
    channels: ChannelHealth[],
    availabilityMap: Map<string, Map<HumanChannel, AssigneeAvailability>>
  ): HumanChannel {
    // Calculate weights based on response time (lower is better) and success rate (higher is better)
    const weights = channels.map((ch) => {
      const loadFactor = ch.currentLoad / ch.maxLoad
      const weight = (ch.successRate * 100) / (ch.responseTime * (1 + loadFactor))
      return weight
    })

    // Select channel with highest weight
    const maxWeight = Math.max(...weights)
    const index = weights.indexOf(maxWeight)
    return channels[index].channel
  }

  /**
   * Random channel selection
   */
  private selectChannelRandom(channels: ChannelHealth[]): HumanChannel {
    const index = Math.floor(Math.random() * channels.length)
    return channels[index].channel
  }

  /**
   * Sticky channel selection (same input -> same channel)
   */
  private selectChannelSticky(channels: ChannelHealth[], input: unknown): HumanChannel {
    // Same as hash for now
    return this.selectChannelHash(channels, input)
  }

  /**
   * Select assignee based on availability and strategy
   */
  private async selectAssignee(
    assignees: string[],
    channel: HumanChannel,
    availabilityMap: Map<string, Map<HumanChannel, AssigneeAvailability>>,
    strategy: RoutingStrategy
  ): Promise<string | undefined> {
    if (assignees.length === 0) return undefined

    // Filter to available assignees on this channel
    const available = assignees.filter((assignee) => {
      const channelMap = availabilityMap.get(assignee)
      const availability = channelMap?.get(channel)
      return availability?.available
    })

    if (available.length === 0) {
      // No one available, return first assignee anyway (will create pending task)
      return assignees[0]
    }

    // Select based on load balancing
    return available.reduce((best, current) => {
      const bestLoad = availabilityMap.get(best)?.get(channel)?.currentLoad || 0
      const currentLoad = availabilityMap.get(current)?.get(channel)?.currentLoad || 0
      return currentLoad < bestLoad ? current : best
    })
  }

  /**
   * Compare channel priority
   */
  private compareChannelPriority(
    a: ChannelHealth,
    b: ChannelHealth,
    context: RoutingContext
  ): number {
    // Preferred order: slack > web > email > voice
    const priority = { slack: 1, web: 2, email: 3, voice: 4 }
    return priority[a.channel] - priority[b.channel]
  }

  /**
   * Hash input for deterministic routing
   */
  private hashInput(input: unknown): number {
    const str = JSON.stringify(input)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Convert priority number to emoji
   */
  private priorityToEmoji(priority?: 1 | 2 | 3 | 4 | 5): string {
    switch (priority) {
      case 1:
        return '🔴 Critical'
      case 2:
        return '🟠 High'
      case 3:
        return '🟡 Medium'
      case 4:
        return '🟢 Low'
      case 5:
        return '⚪ Minimal'
      default:
        return '🟡 Medium'
    }
  }
}

/**
 * Convenience function to create and use router
 */
export async function routeHumanFunction<TInput, TOutput>(
  env: RouterEnv,
  functionDef: HumanFunction<TInput, TOutput>,
  input: TInput,
  context?: Partial<RoutingContext>
): Promise<RoutingDecision> {
  const router = new ChannelRouter(env)
  return await router.route(functionDef, input, context)
}

/**
 * Convenience function to route and send
 */
export async function routeAndSend<TInput, TOutput>(
  env: RouterEnv,
  functionDef: HumanFunction<TInput, TOutput>,
  input: TInput,
  executionId: string,
  context?: Partial<RoutingContext>
): Promise<{ decision: RoutingDecision; sent: boolean }> {
  const router = new ChannelRouter(env)

  const decision = await router.route(functionDef, input, context)

  const payload: RoutingPayload<TInput> = {
    executionId,
    functionName: functionDef.name,
    input,
    assignee: decision.assignee,
    priority: functionDef.routing.priority,
    timeout: functionDef.routing.timeout,
  }

  try {
    await router.sendToChannel(decision.channel, payload)
    return { decision, sent: true }
  } catch (error) {
    // Try fallback
    try {
      const fallbackChannel = await router.fallback(decision.channel, payload, decision.fallbackChannels)
      return {
        decision: { ...decision, channel: fallbackChannel },
        sent: true,
      }
    } catch (fallbackError) {
      return { decision, sent: false }
    }
  }
}
