/**
 * Utility functions for MCP server
 */

/**
 * Validate JSON-RPC 2.0 request
 */
export function validateRequest(request: any): {
  valid: boolean
  error?: string
} {
  if (request.jsonrpc !== '2.0') {
    return { valid: false, error: 'Invalid JSON-RPC version' }
  }

  if (!request.method || typeof request.method !== 'string') {
    return { valid: false, error: 'Missing or invalid method' }
  }

  return { valid: true }
}

/**
 * Create JSON-RPC 2.0 error response
 */
export function createError(
  code: number,
  message: string,
  data?: any,
  id?: string | number | null
): any {
  return {
    jsonrpc: '2.0',
    error: { code, message, data },
    id: id ?? null
  }
}

/**
 * Create JSON-RPC 2.0 success response
 */
export function createSuccess(result: any, id?: string | number | null): any {
  return {
    jsonrpc: '2.0',
    result,
    id: id ?? null
  }
}

/**
 * JSON-RPC 2.0 error codes
 */
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000
} as const
