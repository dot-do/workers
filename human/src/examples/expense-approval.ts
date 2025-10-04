/**
 * Example: Expense Approval via Voice
 *
 * This example shows how to use VoiceChannel to request approval
 * for an expense via phone call.
 */

import { VoiceChannel } from '../channels/voice'
import type { HumanFunctionPayload } from '../types'

export async function requestExpenseApproval(
  voiceChannel: VoiceChannel,
  expense: {
    amount: number
    category: string
    description: string
    submittedBy: string
  },
  approverPhone: string
): Promise<{ approved: boolean; reason?: string }> {
  // Create human function payload
  const payload: HumanFunctionPayload = {
    id: 'expense-' + crypto.randomUUID(),
    functionType: 'approval',
    prompt: `You have a new expense approval request from ${expense.submittedBy}. 
             Amount: $${expense.amount.toFixed(2)} 
             Category: ${expense.category}
             Description: ${expense.description}
             Press 1 to approve, 2 to reject.`,
    timeout: 300000, // 5 minutes
    metadata: {
      expenseId: expense.description,
      amount: expense.amount,
      category: expense.category,
      submittedBy: expense.submittedBy,
    },
  }

  // Initiate call
  const { callSid } = await voiceChannel.initiateCall(approverPhone, payload, {
    recordingEnabled: true,
    maxDuration: 300, // 5 minutes
  })

  // Wait for response (in real implementation, this would be webhook-driven)
  // For demo purposes, we'll poll for status
  let attempts = 0
  while (attempts < 60) {
    await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

    const status = await voiceChannel.getCallStatus(callSid)

    if (status.status === 'completed' && status.response) {
      return {
        approved: status.response.approved,
        reason: status.response.reason,
      }
    }

    if (status.status === 'failed') {
      throw new Error('Call failed')
    }

    attempts++
  }

  throw new Error('Call timeout - no response received')
}
