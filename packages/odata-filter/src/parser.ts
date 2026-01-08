import { Token, TokenType, ASTNode, ParseResult, ParseError } from './types'
import { Tokenizer } from './tokenizer'

/**
 * Parser for OData $filter expressions
 *
 * Converts a sequence of tokens into an Abstract Syntax Tree (AST).
 * Grammar (simplified):
 *
 * Expression     → LogicalOr
 * LogicalOr      → LogicalAnd ( "or" LogicalAnd )*
 * LogicalAnd     → Unary ( "and" Unary )*
 * Unary          → "not" Unary | Comparison
 * Comparison     → Primary ( CompOp Primary )?
 * Primary        → Function | Identifier | Literal | "(" Expression ")"
 * Function       → FunctionName "(" ArgumentList ")"
 * ArgumentList   → Expression ( "," Expression )*
 * CompOp         → "eq" | "ne" | "gt" | "ge" | "lt" | "le"
 */
export class Parser {
  private tokens: Token[] = []
  private current: number = 0
  private errors: ParseError[] = []

  constructor(input: string) {
    const tokenizer = new Tokenizer(input)
    this.tokens = tokenizer.tokenize()
  }

  parse(): ParseResult {
    this.current = 0
    this.errors = []

    try {
      const ast = this.expression()

      // Ensure we consumed all tokens except EOF
      if (!this.isAtEnd() && this.peek().type !== 'EOF') {
        this.error(`Unexpected token '${this.peek().value}' at position ${this.peek().position}`)
      }

      return { ast, errors: this.errors }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.errors.push({ message, position: this.peek()?.position || 0 })

      // Return a minimal AST on error
      return {
        ast: { type: 'Literal', value: null, raw: 'null' },
        errors: this.errors,
      }
    }
  }

  private expression(): ASTNode {
    return this.logicalOr()
  }

  private logicalOr(): ASTNode {
    let left = this.logicalAnd()

    while (this.check('LOGICAL') && this.peek().value === 'or') {
      this.advance() // consume the 'or'
      const operator = 'or' as const
      const right = this.logicalAnd()
      left = {
        type: 'LogicalExpression',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private logicalAnd(): ASTNode {
    let left = this.unary()

    while (this.check('LOGICAL') && this.peek().value === 'and') {
      this.advance() // consume the 'and'
      const operator = 'and' as const
      const right = this.unary()
      left = {
        type: 'LogicalExpression',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private unary(): ASTNode {
    if (this.match('NOT')) {
      const operator = 'not' as const
      const argument = this.unary()
      return {
        type: 'UnaryExpression',
        operator,
        argument,
      }
    }

    return this.comparison()
  }

  private comparison(): ASTNode {
    let left = this.primary()

    if (this.match('OPERATOR')) {
      const op = this.previous().value
      const operator = op as 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'
      const right = this.primary()
      return {
        type: 'BinaryExpression',
        operator,
        left,
        right,
      }
    }

    return left
  }

  private primary(): ASTNode {
    // Function call
    if (this.check('FUNCTION')) {
      return this.functionCall()
    }

    // Literals
    if (this.match('STRING')) {
      const token = this.previous()
      return {
        type: 'Literal',
        value: token.value,
        raw: `'${token.value}'`,
      }
    }

    if (this.match('NUMBER')) {
      const token = this.previous()
      return {
        type: 'Literal',
        value: parseFloat(token.value),
        raw: token.value,
      }
    }

    if (this.match('BOOLEAN')) {
      const token = this.previous()
      return {
        type: 'Literal',
        value: token.value === 'true',
        raw: token.value,
      }
    }

    if (this.match('NULL')) {
      const token = this.previous()
      return {
        type: 'Literal',
        value: null,
        raw: token.value,
      }
    }

    // Identifier
    if (this.match('IDENTIFIER')) {
      const token = this.previous()
      return {
        type: 'Identifier',
        name: token.value,
      }
    }

    // Grouped expression
    if (this.match('LPAREN')) {
      const expr = this.expression()
      this.consume('RPAREN', "Expected ')' after expression")
      return expr
    }

    throw new Error(
      `Unexpected token '${this.peek().value}' at position ${this.peek().position}`
    )
  }

  private functionCall(): ASTNode {
    const nameToken = this.advance()
    const name = nameToken.value as 'contains' | 'startswith' | 'endswith'

    this.consume('LPAREN', `Expected '(' after function name '${name}'`)

    const args: ASTNode[] = []

    if (!this.check('RPAREN')) {
      do {
        args.push(this.expression())
      } while (this.match('COMMA'))
    }

    this.consume('RPAREN', `Expected ')' after function arguments`)

    return {
      type: 'FunctionCall',
      name,
      arguments: args,
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF'
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', position: 0 }
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()

    this.error(message)
    throw new Error(message)
  }

  private error(message: string): void {
    this.errors.push({
      message,
      position: this.peek()?.position || 0,
      token: this.peek(),
    })
  }
}

/**
 * Convenience function to parse a filter expression
 */
export function parseFilter(expression: string): ParseResult {
  const parser = new Parser(expression)
  return parser.parse()
}
