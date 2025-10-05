/**
 * Workflow Queue Consumer
 *
 * Processes workflow execution requests from the queue
 */

import type { Env, WorkflowExecution } from '../types'

export async function handleWorkflowQueue(batch: MessageBatch<WorkflowExecution>, env: Env) {
  for (const message of batch.messages) {
    try {
      const execution = message.body

      // Store execution in database
      await env.DB.prepare(
        `INSERT INTO workflow_executions
         (id, workflowId, accountId, triggeredBy, status, input, context, completedSteps, startedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(execution.id, execution.workflowId, execution.accountId, JSON.stringify(execution.triggeredBy), execution.status, JSON.stringify(execution.input), JSON.stringify(execution.context), JSON.stringify(execution.completedSteps), execution.startedAt)
        .run()

      // Start Cloudflare Workflow
      await env.AUTOMATION_WORKFLOW.create({
        id: execution.id,
        params: execution,
      })

      // Update account usage
      await env.DB.prepare('UPDATE accounts SET currentExecutions = currentExecutions + 1, lastActivity = ? WHERE id = ?').bind(new Date().toISOString(), execution.accountId).run()

      message.ack()
    } catch (error) {
      console.error('Workflow queue error:', error)
      message.retry()
    }
  }
}
