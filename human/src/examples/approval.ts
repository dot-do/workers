import { SlackChannel } from '../channels/slack'
import type { ApprovalInput, ApprovalOutput, ChannelMessage } from '../types'

/**
 * Approval Function - Request human approval via Slack
 *
 * Use cases:
 * - Expense approval
 * - Deployment approval
 * - Content moderation
 * - Legal review
 * - Contract signing
 *
 * Example:
 * ```typescript
 * const result = await requestApproval({
 *   title: 'Approve Expense',
 *   description: 'Request for $500 conference ticket',
 *   approver: 'U12345', // Slack user ID
 *   data: { amount: 500, category: 'conference' },
 *   timeout: 3600, // 1 hour
 * })
 * ```
 */

export async function requestApproval(
  input: ApprovalInput,
  slackConfig: {
    botToken: string
    signingSecret: string
    defaultChannel?: string
  }
): Promise<ApprovalOutput> {
  const slack = new SlackChannel({
    channel: 'slack',
    ...slackConfig,
  })

  // Build approval message
  const message: ChannelMessage = {
    recipientId: input.approver,
    title: input.title,
    text: input.description,
    fields: input.data
      ? Object.entries(input.data).map(([label, value]) => ({
          label,
          value: String(value),
        }))
      : undefined,
    actions: [
      {
        id: 'approve',
        type: 'button',
        label: 'Approve',
        value: 'approved',
        style: 'primary',
        confirm: {
          title: 'Confirm Approval',
          text: 'Are you sure you want to approve this request?',
          confirmLabel: 'Yes, Approve',
          denyLabel: 'Cancel',
        },
      },
      {
        id: 'reject',
        type: 'button',
        label: 'Reject',
        value: 'rejected',
        style: 'destructive',
        confirm: {
          title: 'Confirm Rejection',
          text: 'Are you sure you want to reject this request?',
          confirmLabel: 'Yes, Reject',
          denyLabel: 'Cancel',
        },
      },
      {
        id: 'comment',
        type: 'button',
        label: 'Add Comment',
        value: 'comment',
        style: 'secondary',
      },
    ],
    footer: `Timeout: ${input.timeout || 3600}s`,
  }

  // Send message
  const { id, timestamp } = await slack.sendMessage(message)

  // Wait for response (in real implementation, this would be via webhook)
  // For now, return a mock response
  return {
    approved: true,
    approver: input.approver,
    comment: 'Approved via Slack',
    timestamp,
  }
}

/**
 * Example: Expense Approval
 */
export async function requestExpenseApproval(
  expense: {
    id: string
    amount: number
    category: string
    description: string
    submittedBy: string
  },
  approverId: string,
  slackConfig: any
): Promise<ApprovalOutput> {
  return await requestApproval(
    {
      title: `Expense Approval: $${expense.amount}`,
      description: `${expense.submittedBy} submitted an expense for approval`,
      approver: approverId,
      data: {
        Amount: `$${expense.amount}`,
        Category: expense.category,
        Description: expense.description,
        'Submitted By': expense.submittedBy,
        'Expense ID': expense.id,
      },
      timeout: 86400, // 24 hours
    },
    slackConfig
  )
}

/**
 * Example: Deployment Approval
 */
export async function requestDeploymentApproval(
  deployment: {
    environment: string
    version: string
    changes: string[]
    requestedBy: string
  },
  approverId: string,
  slackConfig: any
): Promise<ApprovalOutput> {
  return await requestApproval(
    {
      title: `Deployment Approval: ${deployment.environment}`,
      description: `${deployment.requestedBy} wants to deploy version ${deployment.version}`,
      approver: approverId,
      data: {
        Environment: deployment.environment,
        Version: deployment.version,
        Changes: deployment.changes.join('\n'),
        'Requested By': deployment.requestedBy,
      },
      timeout: 3600, // 1 hour
    },
    slackConfig
  )
}

/**
 * Example: Content Moderation
 */
export async function requestContentModeration(
  content: {
    id: string
    type: string
    text: string
    author: string
    flaggedReason: string
  },
  moderatorId: string,
  slackConfig: any
): Promise<ApprovalOutput> {
  return await requestApproval(
    {
      title: 'Content Moderation Required',
      description: `Content flagged: ${content.flaggedReason}`,
      approver: moderatorId,
      data: {
        'Content Type': content.type,
        Author: content.author,
        'Flagged Reason': content.flaggedReason,
        Content: content.text.slice(0, 200),
        'Content ID': content.id,
      },
      timeout: 7200, // 2 hours
    },
    slackConfig
  )
}
