/**
 * Utility functions for API worker
 */

import { ulid } from 'ulid'

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return ulid()
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown'
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Check if request is from internal service
 */
export function isInternalRequest(request: Request): boolean {
  // Check for internal service header
  const internalHeader = request.headers.get('x-internal-service')
  return internalHeader === 'true'
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}
