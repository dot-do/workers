import { Token, TokenType } from './types'

/**
 * Tokenizer for OData $filter expressions
 *
 * Converts a filter string into a sequence of tokens for parsing.
 */
export class Tokenizer {
  private input: string
  private position: number = 0
  private tokens: Token[] = []

  constructor(input: string) {
    this.input = input.trim()
  }

  tokenize(): Token[] {
    this.tokens = []
    this.position = 0

    while (this.position < this.input.length) {
      this.skipWhitespace()

      if (this.position >= this.input.length) break

      const char = this.input[this.position]

      // Parentheses
      if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(', position: this.position })
        this.position++
        continue
      }

      if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')', position: this.position })
        this.position++
        continue
      }

      // Comma
      if (char === ',') {
        this.tokens.push({ type: 'COMMA', value: ',', position: this.position })
        this.position++
        continue
      }

      // String literals
      if (char === "'" || char === '"') {
        this.tokenizeString(char)
        continue
      }

      // Numbers
      if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
        this.tokenizeNumber()
        continue
      }

      // Identifiers, keywords, operators, functions
      if (this.isAlpha(char)) {
        this.tokenizeIdentifierOrKeyword()
        continue
      }

      throw new Error(
        `Unexpected character '${char}' at position ${this.position}`
      )
    }

    this.tokens.push({ type: 'EOF', value: '', position: this.position })
    return this.tokens
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && this.isWhitespace(this.input[this.position])) {
      this.position++
    }
  }

  private tokenizeString(quote: string): void {
    const start = this.position
    this.position++ // skip opening quote

    let value = ''
    while (this.position < this.input.length) {
      const char = this.input[this.position]

      if (char === quote) {
        // Check for escaped quote
        if (this.peek() === quote) {
          value += quote
          this.position += 2
          continue
        }
        // End of string
        this.position++
        this.tokens.push({ type: 'STRING', value, position: start })
        return
      }

      value += char
      this.position++
    }

    throw new Error(`Unterminated string starting at position ${start}`)
  }

  private tokenizeNumber(): void {
    const start = this.position
    let value = ''

    // Handle negative sign
    if (this.input[this.position] === '-') {
      value += '-'
      this.position++
    }

    // Integer part
    while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
      value += this.input[this.position]
      this.position++
    }

    // Decimal part
    if (this.position < this.input.length && this.input[this.position] === '.') {
      value += '.'
      this.position++

      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        value += this.input[this.position]
        this.position++
      }
    }

    this.tokens.push({ type: 'NUMBER', value, position: start })
  }

  private tokenizeIdentifierOrKeyword(): void {
    const start = this.position
    let value = ''

    while (
      this.position < this.input.length &&
      (this.isAlphaNumeric(this.input[this.position]) || this.input[this.position] === '_')
    ) {
      value += this.input[this.position]
      this.position++
    }

    const lowerValue = value.toLowerCase()

    // Check for operators
    if (['eq', 'ne', 'gt', 'ge', 'lt', 'le'].includes(lowerValue)) {
      this.tokens.push({ type: 'OPERATOR', value: lowerValue, position: start })
      return
    }

    // Check for logical operators
    if (lowerValue === 'and' || lowerValue === 'or') {
      this.tokens.push({ type: 'LOGICAL', value: lowerValue, position: start })
      return
    }

    // Check for NOT
    if (lowerValue === 'not') {
      this.tokens.push({ type: 'NOT', value: lowerValue, position: start })
      return
    }

    // Check for boolean literals
    if (lowerValue === 'true' || lowerValue === 'false') {
      this.tokens.push({ type: 'BOOLEAN', value: lowerValue, position: start })
      return
    }

    // Check for null
    if (lowerValue === 'null') {
      this.tokens.push({ type: 'NULL', value: lowerValue, position: start })
      return
    }

    // Check for functions
    if (['contains', 'startswith', 'endswith'].includes(lowerValue)) {
      this.tokens.push({ type: 'FUNCTION', value: lowerValue, position: start })
      return
    }

    // Default to identifier
    this.tokens.push({ type: 'IDENTIFIER', value, position: start })
  }

  private peek(offset: number = 1): string {
    const pos = this.position + offset
    return pos < this.input.length ? this.input[pos] : ''
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char)
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char)
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char)
  }
}
