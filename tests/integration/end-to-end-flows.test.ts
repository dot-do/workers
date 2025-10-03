/**
 * End-to-End Flow Integration Tests
 *
 * Tests complete user journeys through multiple services
 */

import { describe, it, expect } from 'vitest'
import { testRequest, assertSuccess, testData, measureTime, assertPerformance } from './setup'

describe('End-to-End Flows', () => {
  describe('User Registration Flow', () => {
    it('should complete full user registration', async () => {
      const userData = testData.user()

      // 1. Create user account (Gateway → Auth → DB)
      const createResponse = await testRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          name: userData.name,
          password: 'SecurePassword123!',
        }),
      })

      assertSuccess(createResponse)
      const user = await createResponse.json()

      expect(user).toHaveProperty('id')
      expect(user.email).toBe(userData.email)

      // 2. Send welcome email (Gateway → Email)
      const emailResponse = await testRequest('/api/email/send', {
        method: 'POST',
        body: JSON.stringify({
          to: user.email,
          template: 'welcome',
          data: { name: user.name },
        }),
      })

      assertSuccess(emailResponse)
      const email = await emailResponse.json()
      expect(email).toHaveProperty('emailId')

      // 3. Schedule onboarding tasks (Gateway → Schedule)
      const scheduleResponse = await testRequest('/api/schedule/task', {
        method: 'POST',
        body: JSON.stringify({
          name: `onboarding-${user.id}`,
          cron: '0 0 * * *',
          handler: 'handlers/onboarding',
          data: { userId: user.id },
        }),
      })

      assertSuccess(scheduleResponse)

      // 4. Dispatch webhook event (Gateway → Webhooks)
      const webhookResponse = await testRequest('/api/webhooks/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          event: 'user.created',
          data: { userId: user.id, email: user.email },
        }),
      })

      assertSuccess(webhookResponse)
    })

    it('should measure registration flow performance', async () => {
      const { duration } = await measureTime(async () => {
        const userData = testData.user()

        await testRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: userData.email,
            name: userData.name,
            password: 'SecurePassword123!',
          }),
        })
      })

      // Full registration should complete within 500ms
      assertPerformance(duration, 500)
    })
  })

  describe('API Key Creation Flow', () => {
    it('should create and use API key', async () => {
      const keyData = testData.apiKey()

      // 1. Create API key (Gateway → Auth → DB)
      const createResponse = await testRequest('/api/auth/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: keyData.name,
          scopes: ['read:users', 'write:users'],
        }),
      })

      assertSuccess(createResponse)
      const apiKey = await createResponse.json()

      expect(apiKey).toHaveProperty('key')
      expect(apiKey).toHaveProperty('id')

      // 2. Use new API key (Gateway → Auth validation)
      const useResponse = await testRequest('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${apiKey.key}`,
        },
      })

      assertSuccess(useResponse)

      // 3. Log API key usage (Gateway → DB)
      const logsResponse = await testRequest(`/api/auth/keys/${apiKey.id}/logs`)

      assertSuccess(logsResponse)
      const logs = await logsResponse.json()
      expect(logs.logs).toHaveLength(1) // Should log the /api/auth/me request
    })
  })

  describe('Webhook Registration & Dispatch Flow', () => {
    it('should register webhook and receive events', async () => {
      const webhookData = testData.webhook()

      // 1. Register webhook (Gateway → Webhooks → DB)
      const registerResponse = await testRequest('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          url: webhookData.url,
          events: webhookData.events,
          secret: 'webhook-secret-123',
        }),
      })

      assertSuccess(registerResponse)
      const webhook = await registerResponse.json()

      expect(webhook).toHaveProperty('id')
      expect(webhook.url).toBe(webhookData.url)

      // 2. Dispatch test event (Gateway → Webhooks → Queue)
      const dispatchResponse = await testRequest('/api/webhooks/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          event: webhookData.events[0],
          data: { test: true },
        }),
      })

      assertSuccess(dispatchResponse)
      const dispatch = await dispatchResponse.json()
      expect(dispatch).toHaveProperty('dispatched', true)

      // 3. Check delivery logs (Gateway → Webhooks → DB)
      const logsResponse = await testRequest(`/api/webhooks/${webhook.id}/logs`)

      assertSuccess(logsResponse)
      const logs = await logsResponse.json()
      expect(logs.logs.length).toBeGreaterThan(0)
    })
  })

  describe('Scheduled Task Flow', () => {
    it('should schedule and execute task', async () => {
      // 1. Schedule task (Gateway → Schedule → DB)
      const scheduleResponse = await testRequest('/api/schedule/tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: 'daily-cleanup',
          cron: '0 0 * * *',
          handler: 'handlers/cleanup',
          data: { type: 'full' },
        }),
      })

      assertSuccess(scheduleResponse)
      const task = await scheduleResponse.json()

      expect(task).toHaveProperty('taskId')
      expect(task).toHaveProperty('nextRun')

      // 2. Get task status (Gateway → Schedule → DB)
      const statusResponse = await testRequest(`/api/schedule/tasks/${task.taskId}`)

      assertSuccess(statusResponse)
      const status = await statusResponse.json()

      expect(status.status).toBe('scheduled')

      // 3. Manually trigger task (Gateway → Schedule → Queue)
      const triggerResponse = await testRequest(`/api/schedule/tasks/${task.taskId}/trigger`, {
        method: 'POST',
      })

      assertSuccess(triggerResponse)

      // 4. Check execution history (Gateway → Schedule → DB)
      const historyResponse = await testRequest(`/api/schedule/tasks/${task.taskId}/history`)

      assertSuccess(historyResponse)
      const history = await historyResponse.json()
      expect(history.executions.length).toBeGreaterThan(0)
    })
  })

  describe('Email Campaign Flow', () => {
    it('should send email campaign', async () => {
      // 1. Get user list (Gateway → DB)
      const usersResponse = await testRequest('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'SELECT id, email, name FROM users WHERE active = true LIMIT 10',
          params: [],
        }),
      })

      assertSuccess(usersResponse)
      const users = await usersResponse.json()

      // 2. Queue emails (Gateway → Queue)
      const queueResponse = await testRequest('/api/queue/batch', {
        method: 'POST',
        body: JSON.stringify({
          queue: 'email',
          messages: users.data.map((user: any) => ({
            task: 'send-email',
            userId: user.id,
            template: 'campaign',
          })),
        }),
      })

      assertSuccess(queueResponse)
      const queued = await queueResponse.json()
      expect(queued.queued).toBe(users.data.length)

      // 3. Process queue (Queue → Email)
      // Queue consumer will process these asynchronously

      // 4. Check email stats (Gateway → Email → DB)
      const statsResponse = await testRequest('/api/email/stats', {
        method: 'POST',
        body: JSON.stringify({
          template: 'campaign',
          startDate: new Date(Date.now() - 86400000).toISOString(),
        }),
      })

      assertSuccess(statsResponse)
    })
  })

  describe('MCP Tool Execution Flow', () => {
    it('should execute MCP tool chain', async () => {
      // 1. List available tools (Gateway → MCP)
      const toolsResponse = await testRequest('/api/mcp/tools')

      assertSuccess(toolsResponse)
      const tools = await toolsResponse.json()
      expect(tools.tools.length).toBeGreaterThan(0)

      // 2. Execute database query tool (Gateway → MCP → DB)
      const executeResponse = await testRequest('/api/mcp/tools/db_query/execute', {
        method: 'POST',
        body: JSON.stringify({
          arguments: {
            sql: 'SELECT COUNT(*) as count FROM users',
          },
        }),
      })

      assertSuccess(executeResponse)
      const result = await executeResponse.json()
      expect(result).toHaveProperty('success', true)

      // 3. Execute user creation tool (Gateway → MCP → Auth → DB → Email)
      const createToolResponse = await testRequest('/api/mcp/tools/create_user/execute', {
        method: 'POST',
        body: JSON.stringify({
          arguments: {
            email: 'mcp-test@example.com',
            name: 'MCP Test User',
          },
        }),
      })

      assertSuccess(createToolResponse)
    })
  })

  describe('Database Transaction Flow', () => {
    it('should execute multi-step transaction', async () => {
      // 1. Begin transaction (Gateway → DB)
      const userData = testData.user()

      const transactionResponse = await testRequest('/api/db/transaction', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              sql: 'INSERT INTO users (email, name) VALUES (?, ?)',
              params: [userData.email, userData.name],
            },
            {
              sql: 'INSERT INTO api_keys (user_id, key) VALUES (LAST_INSERT_ID(), ?)',
              params: ['generated-key-123'],
            },
            {
              sql: 'INSERT INTO audit_log (action, user_id) VALUES (?, LAST_INSERT_ID())',
              params: ['user_created'],
            },
          ],
        }),
      })

      assertSuccess(transactionResponse)
      const transaction = await transactionResponse.json()
      expect(transaction).toHaveProperty('success', true)

      // All operations should succeed or all should fail
      expect(transaction.results).toHaveLength(3)
    })

    it('should rollback failed transaction', async () => {
      const transactionResponse = await testRequest('/api/db/transaction', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              sql: 'INSERT INTO users (email, name) VALUES (?, ?)',
              params: ['test@example.com', 'Test User'],
            },
            {
              sql: 'INVALID SQL SYNTAX',
              params: [],
            },
          ],
        }),
      })

      // Transaction should fail
      expect(transactionResponse.status).toBeGreaterThanOrEqual(400)

      // Verify first operation was rolled back
      const checkResponse = await testRequest('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'SELECT * FROM users WHERE email = ?',
          params: ['test@example.com'],
        }),
      })

      assertSuccess(checkResponse)
      const check = await checkResponse.json()
      expect(check.data).toHaveLength(0) // User should not exist
    })
  })

  describe('Performance - End-to-End', () => {
    it('should complete full user flow within budget', async () => {
      const { duration } = await measureTime(async () => {
        const userData = testData.user()

        // Complete flow: Register → Send email → Schedule task → Dispatch webhook
        const user = await testRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: userData.email,
            name: userData.name,
            password: 'SecurePassword123!',
          }),
        })

        await testRequest('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: userData.email,
            template: 'welcome',
          }),
        })

        await testRequest('/api/webhooks/dispatch', {
          method: 'POST',
          body: JSON.stringify({
            event: 'user.created',
            data: { userId: (await user.json()).id },
          }),
        })
      })

      // Full flow should complete within 1 second
      assertPerformance(duration, 1000)
    })

    it('should handle concurrent user flows', async () => {
      const { duration } = await measureTime(async () => {
        const flows = Array.from({ length: 10 }, async () => {
          const userData = testData.user()

          return await testRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: userData.email,
              name: userData.name,
              password: 'SecurePassword123!',
            }),
          })
        })

        const results = await Promise.all(flows)
        results.forEach((response) => assertSuccess(response))
      })

      // 10 concurrent flows should complete within 2 seconds
      assertPerformance(duration, 2000)
    })
  })
})
