/**
 * Unit tests for human function types and schemas
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { ComponentType } from 'react'
import {
  humanChannelSchema,
  executionStatusSchema,
  slaSchema,
  routingConfigSchema,
  humanFunctionSchema,
  executionRequestSchema,
  executionResultSchema,
  executionRecordSchema,
  validateExecutionRequest,
  validateExecutionResult,
  validateExecutionRecord,
  validateHumanFunction,
  safeValidateExecutionRequest,
  isHumanChannel,
  isExecutionStatus,
  SchemaValidationError,
  validateWithError,
  validateBatch,
  HumanFunctionError,
  ValidationError,
  TimeoutError,
  NotFoundError,
  RoutingError,
} from '../src'
import type { HumanFunction, ExecutionRequest, ExecutionResult, ExecutionRecord } from '../src'

describe('Human Function Types', () => {
  describe('HumanChannel Schema', () => {
    it('should validate valid channels', () => {
      expect(humanChannelSchema.parse('slack')).toBe('slack')
      expect(humanChannelSchema.parse('web')).toBe('web')
      expect(humanChannelSchema.parse('voice')).toBe('voice')
      expect(humanChannelSchema.parse('email')).toBe('email')
    })

    it('should reject invalid channels', () => {
      expect(() => humanChannelSchema.parse('invalid')).toThrow()
      expect(() => humanChannelSchema.parse('')).toThrow()
      expect(() => humanChannelSchema.parse(null)).toThrow()
    })
  })

  describe('ExecutionStatus Schema', () => {
    it('should validate valid statuses', () => {
      expect(executionStatusSchema.parse('pending')).toBe('pending')
      expect(executionStatusSchema.parse('in_progress')).toBe('in_progress')
      expect(executionStatusSchema.parse('completed')).toBe('completed')
      expect(executionStatusSchema.parse('timeout')).toBe('timeout')
      expect(executionStatusSchema.parse('cancelled')).toBe('cancelled')
      expect(executionStatusSchema.parse('error')).toBe('error')
    })

    it('should reject invalid statuses', () => {
      expect(() => executionStatusSchema.parse('invalid')).toThrow()
    })
  })

  describe('SLA Schema', () => {
    it('should validate valid SLA', () => {
      const sla = { warning: 3600000, critical: 7200000 }
      expect(slaSchema.parse(sla)).toEqual(sla)
    })

    it('should reject invalid SLA', () => {
      expect(() => slaSchema.parse({ warning: -1, critical: 100 })).toThrow()
      expect(() => slaSchema.parse({ warning: 0, critical: 100 })).toThrow()
      expect(() => slaSchema.parse({ warning: 100 })).toThrow()
    })
  })

  describe('RoutingConfig Schema', () => {
    it('should validate basic routing config', () => {
      const config = {
        channels: ['slack', 'web'] as const,
      }
      expect(routingConfigSchema.parse(config)).toEqual(config)
    })

    it('should validate full routing config', () => {
      const config = {
        channels: ['slack'] as const,
        assignees: ['user1', 'user2'],
        timeout: 86400000,
        sla: { warning: 43200000, critical: 86400000 },
        priority: 1 as const,
        tags: ['expense', 'approval'],
      }
      const result = routingConfigSchema.parse(config)
      expect(result.channels).toEqual(['slack'])
      expect(result.assignees).toEqual(['user1', 'user2'])
      expect(result.timeout).toBe(86400000)
      expect(result.priority).toBe(1)
      expect(result.tags).toEqual(['expense', 'approval'])
    })

    it('should reject empty channels', () => {
      expect(() => routingConfigSchema.parse({ channels: [] })).toThrow()
    })

    it('should reject invalid priority', () => {
      expect(() => routingConfigSchema.parse({ channels: ['web'], priority: 0 })).toThrow()
      expect(() => routingConfigSchema.parse({ channels: ['web'], priority: 6 })).toThrow()
    })
  })

  describe('HumanFunction Schema', () => {
    const mockComponent = (() => null) as unknown as ComponentType<any>

    const validFunction = {
      name: 'approve-expense',
      description: 'Approve or reject expense claims',
      schema: {
        input: z.object({ amount: z.number() }),
        output: z.object({ approved: z.boolean() }),
      },
      routing: {
        channels: ['slack', 'web'] as const,
      },
      ui: {
        prompt: mockComponent,
      },
    }

    it('should validate valid function', () => {
      const result = humanFunctionSchema.parse(validFunction)
      expect(result.name).toBe('approve-expense')
      expect(result.description).toBe('Approve or reject expense claims')
    })

    it('should validate function with all optional fields', () => {
      const fullFunction = {
        ...validFunction,
        routing: {
          channels: ['slack'] as const,
          assignees: ['manager'],
          timeout: 86400000,
          sla: { warning: 43200000, critical: 86400000 },
          priority: 1 as const,
          tags: ['expense'],
        },
        ui: {
          prompt: mockComponent,
          form: mockComponent,
          review: mockComponent,
          className: 'custom-class',
          theme: { primary: '#000' },
        },
        onTimeout: () => ({ approved: false }),
        onComplete: () => {},
        metadata: { version: '1.0.0' },
        version: '1.0.0',
        enabled: true,
      }
      const result = humanFunctionSchema.parse(fullFunction)
      expect(result.name).toBe('approve-expense')
      expect(result.enabled).toBe(true)
    })

    it('should reject invalid function names', () => {
      expect(() => humanFunctionSchema.parse({ ...validFunction, name: 'Invalid Name' })).toThrow()
      expect(() => humanFunctionSchema.parse({ ...validFunction, name: 'invalid_name' })).toThrow()
      expect(() => humanFunctionSchema.parse({ ...validFunction, name: '' })).toThrow()
    })

    it('should reject empty description', () => {
      expect(() => humanFunctionSchema.parse({ ...validFunction, description: '' })).toThrow()
    })

    it('should reject missing required fields', () => {
      expect(() => humanFunctionSchema.parse({ name: 'test' })).toThrow()
      expect(() => humanFunctionSchema.parse({ name: 'test', description: 'desc' })).toThrow()
    })
  })

  describe('ExecutionRequest Schema', () => {
    it('should validate basic request', () => {
      const request = {
        functionName: 'approve-expense',
        input: { amount: 100 },
      }
      expect(executionRequestSchema.parse(request)).toEqual(request)
    })

    it('should validate full request', () => {
      const request = {
        functionName: 'approve-expense',
        input: { amount: 100 },
        channel: 'slack' as const,
        assignee: 'user1',
        timeout: 86400000,
        metadata: { source: 'api' },
        correlationId: 'correlation-123',
      }
      const result = executionRequestSchema.parse(request)
      expect(result.channel).toBe('slack')
      expect(result.assignee).toBe('user1')
      expect(result.correlationId).toBe('correlation-123')
    })

    it('should reject invalid function names', () => {
      expect(() => executionRequestSchema.parse({ functionName: 'Invalid Name', input: {} })).toThrow()
    })

    it('should reject negative timeout', () => {
      expect(() => executionRequestSchema.parse({ functionName: 'test', input: {}, timeout: -1 })).toThrow()
    })
  })

  describe('ExecutionResult Schema', () => {
    it('should validate basic result', () => {
      const result = {
        executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        output: { approved: true },
        completedAt: new Date(),
        duration: 5000,
      }
      expect(executionResultSchema.parse(result)).toEqual(result)
    })

    it('should validate full result', () => {
      const result = {
        executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        output: { approved: true },
        completedAt: new Date(),
        duration: 5000,
        assignee: 'user1',
        metadata: { notes: 'looks good' },
      }
      const parsed = executionResultSchema.parse(result)
      expect(parsed.assignee).toBe('user1')
      expect(parsed.metadata).toEqual({ notes: 'looks good' })
    })

    it('should reject invalid UUID', () => {
      expect(() =>
        executionResultSchema.parse({
          executionId: 'invalid-uuid',
          output: {},
          completedAt: new Date(),
          duration: 5000,
        })
      ).toThrow()
    })

    it('should reject negative duration', () => {
      expect(() =>
        executionResultSchema.parse({
          executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          output: {},
          completedAt: new Date(),
          duration: -1,
        })
      ).toThrow()
    })
  })

  describe('ExecutionRecord Schema', () => {
    it('should validate pending record', () => {
      const record = {
        executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        functionName: 'approve-expense',
        status: 'pending' as const,
        input: { amount: 100 },
        channel: 'slack' as const,
        createdAt: new Date(),
      }
      expect(executionRecordSchema.parse(record)).toEqual(record)
    })

    it('should validate completed record', () => {
      const record = {
        executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        functionName: 'approve-expense',
        status: 'completed' as const,
        input: { amount: 100 },
        output: { approved: true },
        channel: 'slack' as const,
        assignee: 'user1',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      }
      const parsed = executionRecordSchema.parse(record)
      expect(parsed.status).toBe('completed')
      expect(parsed.output).toEqual({ approved: true })
    })

    it('should validate error record', () => {
      const record = {
        executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        functionName: 'approve-expense',
        status: 'error' as const,
        input: { amount: 100 },
        channel: 'slack' as const,
        createdAt: new Date(),
        error: {
          message: 'Something went wrong',
          stack: 'Error: Something went wrong\n  at ...',
        },
      }
      const parsed = executionRecordSchema.parse(record)
      expect(parsed.status).toBe('error')
      expect(parsed.error?.message).toBe('Something went wrong')
    })
  })
})

describe('Validation Helpers', () => {
  describe('validateExecutionRequest', () => {
    it('should validate valid request', () => {
      const request = { functionName: 'test-func', input: { foo: 'bar' } }
      expect(validateExecutionRequest(request)).toEqual(request)
    })

    it('should throw on invalid request', () => {
      expect(() => validateExecutionRequest({ functionName: 'Invalid Name' })).toThrow()
    })
  })

  describe('safeValidateExecutionRequest', () => {
    it('should return success for valid request', () => {
      const request = { functionName: 'test-func', input: {} }
      const result = safeValidateExecutionRequest(request)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(request)
      }
    })

    it('should return error for invalid request', () => {
      const result = safeValidateExecutionRequest({ functionName: 'Invalid Name' })
      expect(result.success).toBe(false)
    })
  })

  describe('validateWithError', () => {
    it('should validate valid data', () => {
      const schema = z.object({ name: z.string() })
      expect(validateWithError(schema, { name: 'test' })).toEqual({ name: 'test' })
    })

    it('should throw SchemaValidationError on invalid data', () => {
      const schema = z.object({ name: z.string() })
      try {
        validateWithError(schema, { name: 123 }, 'test object')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError)
        if (error instanceof SchemaValidationError) {
          expect(error.message).toContain('test object')
          expect(error.issues).toBeDefined()
          expect(error.toJSON()).toHaveProperty('issues')
        }
      }
    })
  })

  describe('validateBatch', () => {
    it('should validate all valid items', () => {
      const schema = z.object({ value: z.number() })
      const data = [{ value: 1 }, { value: 2 }, { value: 3 }]
      const result = validateBatch(schema, data)
      expect(result.valid).toEqual(data)
      expect(result.errors).toHaveLength(0)
    })

    it('should separate valid and invalid items', () => {
      const schema = z.object({ value: z.number() })
      const data = [{ value: 1 }, { value: 'invalid' }, { value: 3 }, { value: 'also-invalid' }]
      const result = validateBatch(schema, data)
      expect(result.valid).toEqual([{ value: 1 }, { value: 3 }])
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].index).toBe(1)
      expect(result.errors[1].index).toBe(3)
    })

    it('should handle all invalid items', () => {
      const schema = z.object({ value: z.number() })
      const data = [{ value: 'a' }, { value: 'b' }]
      const result = validateBatch(schema, data)
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(2)
    })
  })
})

describe('Type Guards', () => {
  describe('isHumanChannel', () => {
    it('should return true for valid channels', () => {
      expect(isHumanChannel('slack')).toBe(true)
      expect(isHumanChannel('web')).toBe(true)
      expect(isHumanChannel('voice')).toBe(true)
      expect(isHumanChannel('email')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isHumanChannel('invalid')).toBe(false)
      expect(isHumanChannel('')).toBe(false)
      expect(isHumanChannel(null)).toBe(false)
      expect(isHumanChannel(undefined)).toBe(false)
      expect(isHumanChannel(123)).toBe(false)
    })
  })

  describe('isExecutionStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isExecutionStatus('pending')).toBe(true)
      expect(isExecutionStatus('in_progress')).toBe(true)
      expect(isExecutionStatus('completed')).toBe(true)
      expect(isExecutionStatus('timeout')).toBe(true)
      expect(isExecutionStatus('cancelled')).toBe(true)
      expect(isExecutionStatus('error')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isExecutionStatus('invalid')).toBe(false)
      expect(isExecutionStatus('')).toBe(false)
      expect(isExecutionStatus(null)).toBe(false)
    })
  })
})

describe('Error Classes', () => {
  describe('HumanFunctionError', () => {
    it('should create error with code and details', () => {
      const error = new HumanFunctionError('Test error', 'TEST_CODE', { foo: 'bar' })
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ foo: 'bar' })
      expect(error.name).toBe('HumanFunctionError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input', { field: 'amount' })
      expect(error.message).toBe('Invalid input')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual({ field: 'amount' })
      expect(error.name).toBe('ValidationError')
      expect(error).toBeInstanceOf(HumanFunctionError)
    })
  })

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Execution timed out', { executionId: '123' })
      expect(error.message).toBe('Execution timed out')
      expect(error.code).toBe('TIMEOUT_ERROR')
      expect(error.name).toBe('TimeoutError')
    })
  })

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('Function not found', { functionName: 'test' })
      expect(error.message).toBe('Function not found')
      expect(error.code).toBe('NOT_FOUND_ERROR')
      expect(error.name).toBe('NotFoundError')
    })
  })

  describe('RoutingError', () => {
    it('should create routing error', () => {
      const error = new RoutingError('No assignees available', { channel: 'slack' })
      expect(error.message).toBe('No assignees available')
      expect(error.code).toBe('ROUTING_ERROR')
      expect(error.name).toBe('RoutingError')
    })
  })
})

describe('Type Safety', () => {
  it('should enforce type safety on HumanFunction', () => {
    const ExpenseInputSchema = z.object({
      amount: z.number(),
      category: z.string(),
    })

    const ExpenseOutputSchema = z.object({
      approved: z.boolean(),
      reason: z.string().optional(),
    })

    type ExpenseInput = z.infer<typeof ExpenseInputSchema>
    type ExpenseOutput = z.infer<typeof ExpenseOutputSchema>

    const mockComponent = (() => null) as unknown as ComponentType<any>

    const expenseFunction: HumanFunction<ExpenseInput, ExpenseOutput> = {
      name: 'approve-expense',
      description: 'Approve expense claims',
      schema: {
        input: ExpenseInputSchema,
        output: ExpenseOutputSchema,
      },
      routing: {
        channels: ['slack', 'web'],
        assignees: ['manager'],
      },
      ui: {
        prompt: mockComponent,
      },
    }

    // Type checking
    expect(expenseFunction.name).toBe('approve-expense')
    expect(expenseFunction.schema.input).toBe(ExpenseInputSchema)
    expect(expenseFunction.schema.output).toBe(ExpenseOutputSchema)
  })

  it('should enforce type safety on ExecutionRequest', () => {
    const request: ExecutionRequest<{ amount: number }> = {
      functionName: 'approve-expense',
      input: { amount: 100 },
    }

    expect(request.input.amount).toBe(100)
  })

  it('should enforce type safety on ExecutionResult', () => {
    const result: ExecutionResult<{ approved: boolean }> = {
      executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      output: { approved: true },
      completedAt: new Date(),
      duration: 5000,
    }

    expect(result.output.approved).toBe(true)
  })

  it('should enforce type safety on ExecutionRecord', () => {
    const record: ExecutionRecord<{ amount: number }, { approved: boolean }> = {
      executionId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      functionName: 'approve-expense',
      status: 'completed',
      input: { amount: 100 },
      output: { approved: true },
      channel: 'slack',
      createdAt: new Date(),
      completedAt: new Date(),
    }

    expect(record.input.amount).toBe(100)
    expect(record.output?.approved).toBe(true)
  })
})
