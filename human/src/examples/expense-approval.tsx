/**
 * Example: Expense Approval Form
 *
 * Demonstrates universal component rendering across all channels
 */

import { Prompt, Form, Select, TextInput, Button, Review, validators } from '../components'
import type { SelectOption, ReviewItem } from '../renderers/base'

/**
 * Expense input data
 */
export interface ExpenseInput {
  amount: number
  category: string
  description: string
  merchant: string
  date: string
  submittedBy: string
}

/**
 * Expense approval result
 */
export interface ExpenseApproval {
  approved: boolean
  reason: string
  approvedBy: string
  approvedAt: string
}

/**
 * Step 1: Display expense details for review
 */
export function ExpenseReviewPrompt({ expense }: { expense: ExpenseInput }) {
  const items: ReviewItem[] = [
    { label: 'Amount', value: expense.amount, format: 'currency' },
    { label: 'Category', value: expense.category },
    { label: 'Description', value: expense.description },
    { label: 'Merchant', value: expense.merchant },
    { label: 'Date', value: expense.date, format: 'date' },
    { label: 'Submitted By', value: expense.submittedBy },
  ]

  return <Review title="Expense Report Details" items={items} />
}

/**
 * Step 2: Approval form
 */
export function ExpenseApprovalForm({ expense }: { expense: ExpenseInput }) {
  const approvalOptions: SelectOption[] = [
    { value: 'approve', label: 'Approve', description: 'Approve this expense' },
    { value: 'reject', label: 'Reject', description: 'Reject this expense' },
    { value: 'request_info', label: 'Request More Info', description: 'Ask for additional details' },
  ]

  return (
    <Form action="/expense/approve" method="post">
      <Prompt type="info">Review the expense report below and make your decision.</Prompt>

      <ExpenseReviewPrompt expense={expense} />

      <Select name="decision" label="Decision" options={approvalOptions} required validation={[validators.required('Please select a decision')]} />

      <TextInput
        name="reason"
        label="Reason / Comments"
        placeholder="Provide a reason for your decision..."
        required
        validation={[validators.required('Please provide a reason'), validators.minLength(10, 'Reason must be at least 10 characters')]}
      />

      <Button type="submit" variant="primary">
        Submit Decision
      </Button>
    </Form>
  )
}

/**
 * Step 3: Confirmation
 */
export function ExpenseApprovalConfirmation({ expense, approval }: { expense: ExpenseInput; approval: ExpenseApproval }) {
  return (
    <>
      <Prompt type={approval.approved ? 'success' : 'error'}>
        Expense report {approval.approved ? 'approved' : 'rejected'} successfully.
      </Prompt>

      <Review
        title="Decision Summary"
        items={[
          { label: 'Amount', value: expense.amount, format: 'currency' },
          { label: 'Decision', value: approval.approved ? 'Approved' : 'Rejected' },
          { label: 'Reason', value: approval.reason },
          { label: 'Approved By', value: approval.approvedBy },
          { label: 'Date', value: approval.approvedAt, format: 'date' },
        ]}
      />
    </>
  )
}

/**
 * Complete expense approval workflow
 */
export function ExpenseApprovalWorkflow({ expense }: { expense: ExpenseInput }) {
  return (
    <>
      <Prompt type="info">New expense report requires your approval</Prompt>
      <ExpenseApprovalForm expense={expense} />
    </>
  )
}

/**
 * Example usage across channels:
 *
 * Slack:
 * ```typescript
 * const blockkit = await render(
 *   <ExpenseApprovalForm expense={expense} />,
 *   'blockkit'
 * )
 * await slack.chat.postMessage({ blocks: blockkit.blocks })
 * ```
 *
 * Web:
 * ```typescript
 * const web = await render(
 *   <ExpenseApprovalForm expense={expense} />,
 *   'web'
 * )
 * return new Response(web.html, {
 *   headers: { 'Content-Type': 'text/html' }
 * })
 * ```
 *
 * Voice:
 * ```typescript
 * const voice = await render(
 *   <ExpenseApprovalForm expense={expense} />,
 *   'voice'
 * )
 * await vapi.call({
 *   script: voice.script,
 *   prompts: voice.prompts
 * })
 * ```
 *
 * CLI:
 * ```typescript
 * const cli = await render(
 *   <ExpenseApprovalForm expense={expense} />,
 *   'cli'
 * )
 * console.log(cli.output)
 * ```
 */
