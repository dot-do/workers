import { describe, it, expect } from 'vitest'
import { parseFilter } from './parser'
import { BinaryExpression, LogicalExpression, FunctionCall } from './types'

describe('Parser', () => {
  describe('Basic expressions', () => {
    it('should parse simple equality comparison', () => {
      const result = parseFilter("status eq 'active'")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('BinaryExpression')

      const node = result.ast as BinaryExpression
      expect(node.operator).toBe('eq')
      expect(node.left.type).toBe('Identifier')
      expect(node.right.type).toBe('Literal')
    })

    it('should parse number comparisons', () => {
      const result = parseFilter('age gt 18')

      expect(result.errors).toHaveLength(0)
      const node = result.ast as BinaryExpression
      expect(node.operator).toBe('gt')
      expect((node.right as any).value).toBe(18)
    })

    it('should parse all comparison operators', () => {
      const operators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le']

      operators.forEach((op) => {
        const result = parseFilter(`value ${op} 10`)
        expect(result.errors).toHaveLength(0)
        expect((result.ast as BinaryExpression).operator).toBe(op)
      })
    })
  })

  describe('Logical expressions', () => {
    it('should parse AND expressions', () => {
      const result = parseFilter("status eq 'active' and age gt 18")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('LogicalExpression')

      const node = result.ast as LogicalExpression
      expect(node.operator).toBe('and')
      expect(node.left.type).toBe('BinaryExpression')
      expect(node.right.type).toBe('BinaryExpression')
    })

    it('should parse OR expressions', () => {
      const result = parseFilter("status eq 'active' or status eq 'pending'")

      expect(result.errors).toHaveLength(0)
      const node = result.ast as LogicalExpression
      expect(node.operator).toBe('or')
    })

    it('should parse mixed AND/OR with correct precedence', () => {
      // AND has higher precedence than OR
      const result = parseFilter("a eq 1 or b eq 2 and c eq 3")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('LogicalExpression')

      const node = result.ast as LogicalExpression
      expect(node.operator).toBe('or')
      expect(node.right.type).toBe('LogicalExpression')
      expect((node.right as LogicalExpression).operator).toBe('and')
    })
  })

  describe('Unary expressions', () => {
    it('should parse NOT expressions', () => {
      const result = parseFilter("not status eq 'inactive'")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('UnaryExpression')
      expect((result.ast as any).operator).toBe('not')
    })

    it('should parse nested NOT expressions', () => {
      const result = parseFilter('not not value eq true')

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('UnaryExpression')
      expect((result.ast as any).argument.type).toBe('UnaryExpression')
    })
  })

  describe('Function calls', () => {
    it('should parse contains function', () => {
      const result = parseFilter("contains(name, 'John')")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('FunctionCall')

      const node = result.ast as FunctionCall
      expect(node.name).toBe('contains')
      expect(node.arguments).toHaveLength(2)
    })

    it('should parse startswith function', () => {
      const result = parseFilter("startswith(email, 'admin')")

      expect(result.errors).toHaveLength(0)
      const node = result.ast as FunctionCall
      expect(node.name).toBe('startswith')
    })

    it('should parse endswith function', () => {
      const result = parseFilter("endswith(domain, '.com')")

      expect(result.errors).toHaveLength(0)
      const node = result.ast as FunctionCall
      expect(node.name).toBe('endswith')
    })

    it('should parse functions in comparisons', () => {
      const result = parseFilter("contains(name, 'test') eq true")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('BinaryExpression')
      expect((result.ast as BinaryExpression).left.type).toBe('FunctionCall')
    })
  })

  describe('Grouped expressions', () => {
    it('should parse parenthesized expressions', () => {
      const result = parseFilter("(status eq 'active')")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('BinaryExpression')
    })

    it('should parse complex grouped expressions', () => {
      const result = parseFilter("(status eq 'active' or status eq 'pending') and verified eq true")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('LogicalExpression')

      const node = result.ast as LogicalExpression
      expect(node.operator).toBe('and')
      expect(node.left.type).toBe('LogicalExpression')
    })

    it('should handle nested parentheses', () => {
      const result = parseFilter('((a eq 1))')

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('BinaryExpression')
    })
  })

  describe('Literal types', () => {
    it('should parse string literals', () => {
      const result = parseFilter("name eq 'John Doe'")

      expect(result.errors).toHaveLength(0)
      const node = result.ast as BinaryExpression
      expect((node.right as any).value).toBe('John Doe')
    })

    it('should parse number literals', () => {
      const result = parseFilter('count eq 42')

      expect(result.errors).toHaveLength(0)
      const node = result.ast as BinaryExpression
      expect((node.right as any).value).toBe(42)
    })

    it('should parse decimal literals', () => {
      const result = parseFilter('price eq 19.99')

      expect(result.errors).toHaveLength(0)
      const node = result.ast as BinaryExpression
      expect((node.right as any).value).toBe(19.99)
    })

    it('should parse boolean literals', () => {
      const resultTrue = parseFilter('active eq true')
      const resultFalse = parseFilter('disabled eq false')

      expect((resultTrue.ast as BinaryExpression).right.type).toBe('Literal')
      expect(((resultTrue.ast as BinaryExpression).right as any).value).toBe(true)
      expect(((resultFalse.ast as BinaryExpression).right as any).value).toBe(false)
    })

    it('should parse null literals', () => {
      const result = parseFilter('deletedAt eq null')

      expect(result.errors).toHaveLength(0)
      const node = result.ast as BinaryExpression
      expect((node.right as any).value).toBe(null)
    })
  })

  describe('Complex expressions', () => {
    it('should parse date comparison with AND/OR', () => {
      const result = parseFilter("date gt '2024-01-01' and date lt '2024-12-31' or priority eq 'high'")

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('LogicalExpression')
    })

    it('should parse multiple function calls', () => {
      const result = parseFilter("contains(firstName, 'John') and contains(lastName, 'Doe')")

      expect(result.errors).toHaveLength(0)
      const node = result.ast as LogicalExpression
      expect(node.left.type).toBe('FunctionCall')
      expect(node.right.type).toBe('FunctionCall')
    })

    it('should parse deeply nested expressions', () => {
      const result = parseFilter(
        "((a eq 1 and b eq 2) or (c eq 3 and d eq 4)) and e eq 5"
      )

      expect(result.errors).toHaveLength(0)
      expect(result.ast.type).toBe('LogicalExpression')
    })
  })

  describe('Error handling', () => {
    it('should report errors for malformed expressions', () => {
      const result = parseFilter('status eq')

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should report errors for missing parentheses', () => {
      const result = parseFilter('(status eq "active"')

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should report errors for invalid function syntax', () => {
      const result = parseFilter('contains(name')

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should provide helpful error messages', () => {
      const result = parseFilter('status eq "active" extra')

      expect(result.errors[0].message).toContain('Unexpected')
    })
  })

  describe('Edge cases', () => {
    it('should handle extra whitespace', () => {
      const result = parseFilter('  status   eq   "active"  ')

      expect(result.errors).toHaveLength(0)
    })

    it('should handle identifiers with underscores', () => {
      const result = parseFilter("user_status eq 'active'")

      expect(result.errors).toHaveLength(0)
      expect((result.ast as BinaryExpression).left.type).toBe('Identifier')
      expect(((result.ast as BinaryExpression).left as any).name).toBe('user_status')
    })

    it('should handle negative numbers', () => {
      const result = parseFilter('temperature lt -10')

      expect(result.errors).toHaveLength(0)
      expect(((result.ast as BinaryExpression).right as any).value).toBe(-10)
    })
  })
})
