// MCP Tools for Email Validation Service

import type { Env } from './types'
import { EmailValidationService } from './index'

export const mcpTools = [
  {
    name: 'validate_email',
    description: 'Validate a single email address with syntax, MX, disposable, and role checks',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address to validate' },
        checkMX: { type: 'boolean', description: 'Check MX records (default: true)' },
        checkDisposable: { type: 'boolean', description: 'Check for disposable domains (default: true)' },
        checkRole: { type: 'boolean', description: 'Check for role-based addresses (default: true)' },
        checkCatchAll: { type: 'boolean', description: 'Check for catch-all domains (default: false, expensive)' },
      },
      required: ['email'],
    },
    handler: async (input: any, env: Env, ctx: ExecutionContext) => {
      const service = new EmailValidationService(ctx, env)
      const result = await service.validateEmail(input.email, {
        checkMX: input.checkMX,
        checkDisposable: input.checkDisposable,
        checkRole: input.checkRole,
        checkCatchAll: input.checkCatchAll,
      })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  },
  {
    name: 'validate_emails_bulk',
    description: 'Validate multiple email addresses at once (up to 10,000)',
    inputSchema: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string' }, description: 'List of email addresses to validate' },
        checkMX: { type: 'boolean', description: 'Check MX records (default: true)' },
        checkDisposable: { type: 'boolean', description: 'Check for disposable domains (default: true)' },
        checkRole: { type: 'boolean', description: 'Check for role-based addresses (default: true)' },
      },
      required: ['emails'],
    },
    handler: async (input: any, env: Env, ctx: ExecutionContext) => {
      const service = new EmailValidationService(ctx, env)
      const result = await service.bulkValidate(input.emails, {
        checkMX: input.checkMX,
        checkDisposable: input.checkDisposable,
        checkRole: input.checkRole,
      })
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  },
]
