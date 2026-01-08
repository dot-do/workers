/**
 * OData Filter Expression AST Types
 */

export type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NULL'
  | 'OPERATOR'
  | 'LOGICAL'
  | 'FUNCTION'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF'
  | 'NOT'

export interface Token {
  type: TokenType
  value: string
  position: number
}

export type ASTNode =
  | BinaryExpression
  | UnaryExpression
  | LogicalExpression
  | FunctionCall
  | Identifier
  | Literal

export interface BinaryExpression {
  type: 'BinaryExpression'
  operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'
  left: ASTNode
  right: ASTNode
}

export interface UnaryExpression {
  type: 'UnaryExpression'
  operator: 'not'
  argument: ASTNode
}

export interface LogicalExpression {
  type: 'LogicalExpression'
  operator: 'and' | 'or'
  left: ASTNode
  right: ASTNode
}

export interface FunctionCall {
  type: 'FunctionCall'
  name: 'contains' | 'startswith' | 'endswith'
  arguments: ASTNode[]
}

export interface Identifier {
  type: 'Identifier'
  name: string
}

export interface Literal {
  type: 'Literal'
  value: string | number | boolean | null
  raw: string
}

export interface ParseResult {
  ast: ASTNode
  errors: ParseError[]
}

export interface ParseError {
  message: string
  position: number
  token?: Token
}

export interface SQLResult {
  sql: string
  params: any[]
}
