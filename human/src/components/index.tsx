/**
 * Universal UI Components for Multi-Channel Rendering
 *
 * These components work across all channels:
 * - Slack BlockKit
 * - Web (HTML/Next.js)
 * - Voice (VAPI)
 * - CLI (react-ink)
 */

import type {
  PromptProps,
  FormProps,
  TextInputProps,
  SelectProps,
  MultiSelectProps,
  ButtonProps,
  ReviewProps,
  ValidationRule,
  SelectOption,
  ReviewItem,
} from '../renderers/base'

/**
 * Prompt - Display text to user (no input)
 *
 * @example
 * <Prompt type="info">
 *   Please review the following information before continuing.
 * </Prompt>
 */
export function Prompt(props: PromptProps) {
  return null // Rendered by renderer
}
Prompt.displayName = 'Prompt'

/**
 * Form - Container for input fields
 *
 * @example
 * <Form onSubmit={handleSubmit}>
 *   <Prompt>Enter your details:</Prompt>
 *   <TextInput name="name" label="Name" required />
 *   <Button type="submit">Submit</Button>
 * </Form>
 */
export function Form(props: FormProps) {
  return null // Rendered by renderer
}
Form.displayName = 'Form'

/**
 * TextInput - Single-line text input
 *
 * @example
 * <TextInput
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   required
 *   validation={[
 *     { type: 'required', message: 'Email is required' },
 *     { type: 'email', message: 'Must be valid email' }
 *   ]}
 * />
 */
export function TextInput(props: TextInputProps) {
  return null // Rendered by renderer
}
TextInput.displayName = 'TextInput'

/**
 * Select - Dropdown selection
 *
 * @example
 * <Select
 *   name="category"
 *   label="Category"
 *   options={[
 *     { value: 'tech', label: 'Technology' },
 *     { value: 'business', label: 'Business' },
 *     { value: 'other', label: 'Other' }
 *   ]}
 *   required
 * />
 */
export function Select(props: SelectProps) {
  return null // Rendered by renderer
}
Select.displayName = 'Select'

/**
 * MultiSelect - Multiple choice selection
 *
 * @example
 * <MultiSelect
 *   name="interests"
 *   label="Interests"
 *   options={[
 *     { value: 'coding', label: 'Coding' },
 *     { value: 'design', label: 'Design' },
 *     { value: 'marketing', label: 'Marketing' }
 *   ]}
 *   minSelected={1}
 *   maxSelected={3}
 * />
 */
export function MultiSelect(props: MultiSelectProps) {
  return null // Rendered by renderer
}
MultiSelect.displayName = 'MultiSelect'

/**
 * Button - Action button
 *
 * @example
 * <Button type="submit" variant="primary">
 *   Submit
 * </Button>
 */
export function Button(props: ButtonProps) {
  return null // Rendered by renderer
}
Button.displayName = 'Button'

/**
 * Review - Display previous input/output
 *
 * @example
 * <Review
 *   title="Review Your Submission"
 *   items={[
 *     { label: 'Name', value: 'John Doe' },
 *     { label: 'Email', value: 'john@example.com' },
 *     { label: 'Amount', value: 1000, format: 'currency' }
 *   ]}
 * />
 */
export function Review(props: ReviewProps) {
  return null // Rendered by renderer
}
Review.displayName = 'Review'

/**
 * Helper to create validation rules
 */
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    type: 'required',
    message,
  }),

  email: (message = 'Must be a valid email address'): ValidationRule => ({
    type: 'email',
    message,
  }),

  url: (message = 'Must be a valid URL'): ValidationRule => ({
    type: 'url',
    message,
  }),

  pattern: (pattern: string, message: string): ValidationRule => ({
    type: 'pattern',
    message,
    value: pattern,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    type: 'length',
    message: message || `Must be at least ${min} characters`,
    value: min,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    type: 'length',
    message: message || `Must be no more than ${max} characters`,
    value: max,
  }),

  min: (min: number, message?: string): ValidationRule => ({
    type: 'min',
    message: message || `Must be at least ${min}`,
    value: min,
  }),

  max: (max: number, message?: string): ValidationRule => ({
    type: 'max',
    message: message || `Must be no more than ${max}`,
    value: max,
  }),
}

/**
 * Re-export types
 */
export type {
  PromptProps,
  FormProps,
  TextInputProps,
  SelectProps,
  MultiSelectProps,
  ButtonProps,
  ReviewProps,
  ValidationRule,
  SelectOption,
  ReviewItem,
}
