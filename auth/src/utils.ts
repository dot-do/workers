/**
 * Auth Service Utility Functions
 */

import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload, RefreshTokenPayload } from './types'

/**
 * Generate secure random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate API key with prefix
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): { key: string; prefix: string } {
  const prefix = environment === 'live' ? 'sk_live_' : 'sk_test_'
  const random = generateRandomString(32)
  const key = `${prefix}${random}`
  return { key, prefix }
}

/**
 * Hash API key using Web Crypto API
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify API key against hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  const keyHash = await hashApiKey(key)
  return keyHash === hash
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Create JWT token
 */
export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresIn: number = 3600): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  return await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secretKey)
}

/**
 * Verify and decode JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret)

  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as JWTPayload
  } catch (error) {
    throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create refresh token
 */
export async function createRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: number = 604800): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  return await new SignJWT({
    sub: payload.sub,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secretKey)
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string, secret: string): Promise<RefreshTokenPayload> {
  const secretKey = new TextEncoder().encode(secret)

  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as RefreshTokenPayload
  } catch (error) {
    throw new Error(`Refresh token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse bearer token from Authorization header
 */
export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/**
 * Parse session cookie
 */
export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/session=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Format date for expiry (days from now)
 */
export function getExpiryDate(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Check if date has expired
 */
export function isExpired(date: Date | null): boolean {
  if (!date) return false
  return date < new Date()
}

/**
 * Redact sensitive data from API key
 */
export function redactApiKey(key: string): string {
  if (key.length < 12) return '***'
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
}

/**
 * Success response helper
 */
export function success<T>(data: T, message?: string): Response {
  return Response.json({ success: true, data, message }, { status: 200 })
}

/**
 * Error response helper
 */
export function error(code: string, message: string, statusCode: number = 400, details?: any): Response {
  return Response.json({ success: false, error: code, message, details }, { status: statusCode })
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize user input
 */
export function sanitize(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}
