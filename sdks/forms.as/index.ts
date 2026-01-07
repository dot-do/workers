/**
 * forms.as - Create and manage forms
 *
 * Build forms, surveys, and data collection workflows.
 * forms.as/contact, forms.as/survey, forms.as/feedback
 *
 * @see https://forms.as
 *
 * @example
 * ```typescript
 * import { forms } from 'forms.as'
 *
 * // Create a contact form
 * const form = await forms.create({
 *   name: 'contact',
 *   title: 'Contact Us',
 *   fields: [
 *     { name: 'name', type: 'text', required: true },
 *     { name: 'email', type: 'email', required: true },
 *     { name: 'message', type: 'textarea', required: true }
 *   ]
 * })
 *
 * // Get submissions
 * const submissions = await forms.submissions('contact')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type FieldType = 'text' | 'email' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime' | 'file' | 'rating' | 'slider' | 'hidden'

export interface FieldConfig {
  /** Field name/key */
  name: string
  /** Field type */
  type: FieldType
  /** Display label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Required field */
  required?: boolean
  /** Default value */
  defaultValue?: string | number | boolean
  /** Options for select/radio/checkbox */
  options?: Array<{ label: string; value: string }>
  /** Validation rules */
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  /** Conditional display */
  showIf?: { field: string; value: unknown }
  /** Help text */
  helpText?: string
}

export interface FormConfig {
  /** Form name/slug */
  name: string
  /** Display title */
  title?: string
  /** Description */
  description?: string
  /** Form fields */
  fields: FieldConfig[]
  /** Submit button text */
  submitText?: string
  /** Success message */
  successMessage?: string
  /** Redirect URL after submit */
  redirectUrl?: string
  /** Notifications */
  notifications?: {
    email?: string[]
    webhook?: string
    slack?: string
  }
  /** Spam protection */
  captcha?: boolean
  /** Allow multiple submissions */
  multipleSubmissions?: boolean
  /** Custom domain */
  domain?: string
}

export interface Form {
  id: string
  name: string
  title?: string
  description?: string
  fields: FieldConfig[]
  status: 'active' | 'paused' | 'archived'
  url: string
  embedCode: string
  submissionCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Submission {
  id: string
  formId: string
  data: Record<string, unknown>
  metadata: {
    ip?: string
    userAgent?: string
    referrer?: string
    timestamp: Date
  }
  status: 'new' | 'read' | 'archived' | 'spam'
  createdAt: Date
}

export interface FormMetrics {
  views: number
  submissions: number
  conversionRate: number
  avgCompletionTime: number
  dropOffByField: Record<string, number>
  submissionsByDay: Array<{ date: string; count: number }>
  period: string
}

export interface FormIntegration {
  id: string
  type: 'email' | 'webhook' | 'zapier' | 'slack' | 'sheets' | 'airtable' | 'notion'
  config: Record<string, unknown>
  status: 'active' | 'error' | 'disabled'
}

// Client interface
export interface FormsAsClient {
  /**
   * Create a form
   */
  create(config: FormConfig): Promise<Form>

  /**
   * Get form details
   */
  get(name: string): Promise<Form>

  /**
   * List all forms
   */
  list(options?: { status?: Form['status']; limit?: number }): Promise<Form[]>

  /**
   * Update a form
   */
  update(name: string, config: Partial<FormConfig>): Promise<Form>

  /**
   * Delete a form
   */
  delete(name: string): Promise<void>

  /**
   * Submit to a form (for testing or programmatic submissions)
   */
  submit(name: string, data: Record<string, unknown>): Promise<Submission>

  /**
   * Get submissions
   */
  submissions(name: string, options?: { status?: Submission['status']; limit?: number; offset?: number }): Promise<Submission[]>

  /**
   * Get a single submission
   */
  submission(name: string, submissionId: string): Promise<Submission>

  /**
   * Update submission status
   */
  updateSubmission(name: string, submissionId: string, status: Submission['status']): Promise<Submission>

  /**
   * Delete a submission
   */
  deleteSubmission(name: string, submissionId: string): Promise<void>

  /**
   * Export submissions
   */
  export(name: string, format?: 'csv' | 'json' | 'xlsx'): Promise<string | ArrayBuffer>

  /**
   * Get form metrics
   */
  metrics(name: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<FormMetrics>

  /**
   * Add integration
   */
  addIntegration(name: string, integration: Omit<FormIntegration, 'id' | 'status'>): Promise<FormIntegration>

  /**
   * List integrations
   */
  integrations(name: string): Promise<FormIntegration[]>

  /**
   * Remove integration
   */
  removeIntegration(name: string, integrationId: string): Promise<void>

  /**
   * Duplicate a form
   */
  duplicate(name: string, newName: string): Promise<Form>

  /**
   * Pause form
   */
  pause(name: string): Promise<Form>

  /**
   * Resume form
   */
  resume(name: string): Promise<Form>

  /**
   * Get embed code
   */
  embed(name: string, options?: { style?: 'inline' | 'popup' | 'slide'; theme?: 'light' | 'dark' }): Promise<string>

  /**
   * Generate form with AI
   */
  generate(prompt: string): Promise<Form>
}

/**
 * Create a configured forms.as client
 */
export function Forms(options?: ClientOptions): FormsAsClient {
  return createClient<FormsAsClient>('https://forms.as', options)
}

/**
 * Default forms.as client instance
 */
export const forms: FormsAsClient = Forms({
  apiKey: typeof process !== 'undefined' ? (process.env?.FORMS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const create = (config: FormConfig) => forms.create(config)
export const submit = (name: string, data: Record<string, unknown>) => forms.submit(name, data)
export const submissions = (name: string, options?: { status?: Submission['status']; limit?: number }) => forms.submissions(name, options)

export default forms

// Re-export types
export type { ClientOptions } from 'rpc.do'
