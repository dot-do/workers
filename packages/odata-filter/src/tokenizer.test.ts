import { describe, it, expect } from 'vitest'
import { Tokenizer } from './tokenizer'

describe('Tokenizer', () => {
  describe('Basic tokens', () => {
    it('should tokenize identifiers', () => {
      const tokenizer = new Tokenizer('status')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(2) // identifier + EOF
      expect(tokens[0]).toEqual({
        type: 'IDENTIFIER',
        value: 'status',
        position: 0,
      })
    })

    it('should tokenize string literals with single quotes', () => {
      const tokenizer = new Tokenizer("'active'")
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'STRING',
        value: 'active',
        position: 0,
      })
    })

    it('should tokenize string literals with double quotes', () => {
      const tokenizer = new Tokenizer('"active"')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'STRING',
        value: 'active',
        position: 0,
      })
    })

    it('should tokenize numbers', () => {
      const tokenizer = new Tokenizer('42')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'NUMBER',
        value: '42',
        position: 0,
      })
    })

    it('should tokenize decimal numbers', () => {
      const tokenizer = new Tokenizer('3.14')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'NUMBER',
        value: '3.14',
        position: 0,
      })
    })

    it('should tokenize negative numbers', () => {
      const tokenizer = new Tokenizer('-10')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'NUMBER',
        value: '-10',
        position: 0,
      })
    })

    it('should tokenize boolean true', () => {
      const tokenizer = new Tokenizer('true')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'BOOLEAN',
        value: 'true',
        position: 0,
      })
    })

    it('should tokenize boolean false', () => {
      const tokenizer = new Tokenizer('false')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'BOOLEAN',
        value: 'false',
        position: 0,
      })
    })

    it('should tokenize null', () => {
      const tokenizer = new Tokenizer('null')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'NULL',
        value: 'null',
        position: 0,
      })
    })
  })

  describe('Operators', () => {
    it('should tokenize comparison operators', () => {
      const ops = ['eq', 'ne', 'gt', 'ge', 'lt', 'le']

      ops.forEach((op) => {
        const tokenizer = new Tokenizer(op)
        const tokens = tokenizer.tokenize()

        expect(tokens[0]).toEqual({
          type: 'OPERATOR',
          value: op,
          position: 0,
        })
      })
    })

    it('should tokenize logical operators', () => {
      const tokenizer = new Tokenizer('and or')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'LOGICAL',
        value: 'and',
        position: 0,
      })
      expect(tokens[1]).toEqual({
        type: 'LOGICAL',
        value: 'or',
        position: 4,
      })
    })

    it('should tokenize NOT operator', () => {
      const tokenizer = new Tokenizer('not')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'NOT',
        value: 'not',
        position: 0,
      })
    })
  })

  describe('Functions', () => {
    it('should tokenize function names', () => {
      const funcs = ['contains', 'startswith', 'endswith']

      funcs.forEach((func) => {
        const tokenizer = new Tokenizer(func)
        const tokens = tokenizer.tokenize()

        expect(tokens[0]).toEqual({
          type: 'FUNCTION',
          value: func,
          position: 0,
        })
      })
    })
  })

  describe('Punctuation', () => {
    it('should tokenize parentheses', () => {
      const tokenizer = new Tokenizer('()')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'LPAREN',
        value: '(',
        position: 0,
      })
      expect(tokens[1]).toEqual({
        type: 'RPAREN',
        value: ')',
        position: 1,
      })
    })

    it('should tokenize commas', () => {
      const tokenizer = new Tokenizer(',')
      const tokens = tokenizer.tokenize()

      expect(tokens[0]).toEqual({
        type: 'COMMA',
        value: ',',
        position: 0,
      })
    })
  })

  describe('Complex expressions', () => {
    it('should tokenize a simple comparison', () => {
      const tokenizer = new Tokenizer("status eq 'active'")
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(4) // identifier, operator, string, EOF
      expect(tokens[0].type).toBe('IDENTIFIER')
      expect(tokens[1].type).toBe('OPERATOR')
      expect(tokens[2].type).toBe('STRING')
    })

    it('should tokenize a logical expression', () => {
      const tokenizer = new Tokenizer("status eq 'active' and age gt 18")
      const tokens = tokenizer.tokenize()

      expect(tokens[0].value).toBe('status')
      expect(tokens[1].value).toBe('eq')
      expect(tokens[2].value).toBe('active')
      expect(tokens[3].value).toBe('and')
      expect(tokens[4].value).toBe('age')
      expect(tokens[5].value).toBe('gt')
      expect(tokens[6].value).toBe('18')
    })

    it('should tokenize function calls', () => {
      const tokenizer = new Tokenizer("contains(name, 'John')")
      const tokens = tokenizer.tokenize()

      expect(tokens[0].type).toBe('FUNCTION')
      expect(tokens[0].value).toBe('contains')
      expect(tokens[1].type).toBe('LPAREN')
      expect(tokens[2].type).toBe('IDENTIFIER')
      expect(tokens[3].type).toBe('COMMA')
      expect(tokens[4].type).toBe('STRING')
      expect(tokens[5].type).toBe('RPAREN')
    })

    it('should handle whitespace correctly', () => {
      const tokenizer = new Tokenizer('  status   eq   "active"  ')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(4)
      expect(tokens[0].type).toBe('IDENTIFIER')
      expect(tokens[1].type).toBe('OPERATOR')
      expect(tokens[2].type).toBe('STRING')
    })

    it('should tokenize grouped expressions', () => {
      const tokenizer = new Tokenizer("(status eq 'active' or status eq 'pending') and verified eq true")
      const tokens = tokenizer.tokenize()

      expect(tokens[0].type).toBe('LPAREN')
      expect(tokens[tokens.length - 2].type).toBe('BOOLEAN')
    })
  })

  describe('Error handling', () => {
    it('should throw on unterminated string', () => {
      const tokenizer = new Tokenizer("'unterminated")

      expect(() => tokenizer.tokenize()).toThrow('Unterminated string')
    })

    it('should throw on unexpected character', () => {
      const tokenizer = new Tokenizer('status @ active')

      expect(() => tokenizer.tokenize()).toThrow('Unexpected character')
    })
  })

  describe('Edge cases', () => {
    it('should handle escaped quotes in strings', () => {
      const tokenizer = new Tokenizer("'it''s working'")
      const tokens = tokenizer.tokenize()

      expect(tokens[0].value).toBe("it's working")
    })

    it('should handle empty input', () => {
      const tokenizer = new Tokenizer('')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1) // Just EOF
      expect(tokens[0].type).toBe('EOF')
    })

    it('should handle case-insensitive keywords', () => {
      const tokenizer = new Tokenizer('EQ AND OR NOT TRUE FALSE NULL')
      const tokens = tokenizer.tokenize()

      expect(tokens[0].type).toBe('OPERATOR')
      expect(tokens[1].type).toBe('LOGICAL')
      expect(tokens[2].type).toBe('LOGICAL')
      expect(tokens[3].type).toBe('NOT')
      expect(tokens[4].type).toBe('BOOLEAN')
      expect(tokens[5].type).toBe('BOOLEAN')
      expect(tokens[6].type).toBe('NULL')
    })
  })
})
