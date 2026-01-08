// Email/Password Authentication for workers.do
// Provides user signup, login, and session management with validation

import { z } from 'zod'
import type { BetterAuthOptions } from 'better-auth'

/**
 * Email validation schema
 * Ensures valid email format
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters')

/**
 * Password validation schema
 * Enforces strong password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

/**
 * Signup input validation schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(255).trim().optional(),
})

/**
 * Login input validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

/**
 * Types for signup and login
 */
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>

/**
 * User object returned after signup/login
 */
export interface User {
  id: string
  email: string
  name?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Session object
 */
export interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: User
  session: Session
}

/**
 * Authentication error types
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_CREDENTIALS' | 'USER_EXISTS' | 'VALIDATION_ERROR' | 'SESSION_EXPIRED' | 'UNAUTHORIZED'
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Validation error with field details
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * User credentials authentication plugin for Better Auth
 * Enables email/password signup and login
 */
export interface CredentialsAuthConfig {
  /** Enable email verification on signup */
  requireEmailVerification?: boolean
  /** Custom password hashing (default: better-auth's bcrypt) */
  hashPassword?: (password: string) => Promise<string> | string
  /** Custom password verification */
  verifyPassword?: (password: string, hash: string) => Promise<boolean> | boolean
  /** Custom signup validation */
  validateSignup?: (input: SignupInput) => Promise<void> | void
  /** Custom login validation */
  validateLogin?: (input: LoginInput) => Promise<void> | void
}

/**
 * Create Better Auth configuration with email/password credentials
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { credentialsAuth } from '@dotdo/auth/credentials'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [credentialsAuth()],
 * })
 * ```
 */
export function credentialsAuth(config: CredentialsAuthConfig = {}) {
  const {
    requireEmailVerification = false,
    validateSignup,
    validateLogin,
  } = config

  return {
    id: 'credentials',
    endpoints: {
      signUp: {
        method: 'POST',
        handler: async (ctx: any) => {
          // Parse and validate input
          const result = signupSchema.safeParse(ctx.body)
          if (!result.success) {
            const errors = result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            }))
            throw new ValidationError('Validation failed', errors)
          }

          const input = result.data

          // Run custom validation if provided
          if (validateSignup) {
            await validateSignup(input)
          }

          // Check if user already exists
          const existingUser = await ctx.context.internal.adapter.findOne({
            model: 'user',
            where: [{ field: 'email', value: input.email }],
          })

          if (existingUser) {
            throw new AuthenticationError('User with this email already exists', 'USER_EXISTS')
          }

          // Hash password using better-auth's built-in hashing
          const hashedPassword = await ctx.context.password.hash(input.password)

          // Create user
          const user = await ctx.context.internal.adapter.create({
            model: 'user',
            data: {
              email: input.email,
              name: input.name,
              emailVerified: !requireEmailVerification,
            },
          })

          // Create account with hashed password
          await ctx.context.internal.adapter.create({
            model: 'account',
            data: {
              userId: user.id,
              accountId: input.email,
              providerId: 'credential',
              password: hashedPassword,
            },
          })

          // Create session
          const session = await ctx.context.internal.adapter.create({
            model: 'session',
            data: {
              userId: user.id,
              expiresAt: new Date(Date.now() + ctx.context.options.session.expiresIn * 1000),
            },
          })

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            session: {
              id: session.id,
              userId: session.userId,
              expiresAt: session.expiresAt,
              token: session.token,
            },
          }
        },
      },

      signIn: {
        method: 'POST',
        handler: async (ctx: any) => {
          // Parse and validate input
          const result = loginSchema.safeParse(ctx.body)
          if (!result.success) {
            const errors = result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            }))
            throw new ValidationError('Validation failed', errors)
          }

          const input = result.data

          // Run custom validation if provided
          if (validateLogin) {
            await validateLogin(input)
          }

          // Find user by email
          const user = await ctx.context.internal.adapter.findOne({
            model: 'user',
            where: [{ field: 'email', value: input.email }],
          })

          if (!user) {
            throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
          }

          // Find credential account
          const account = await ctx.context.internal.adapter.findOne({
            model: 'account',
            where: [
              { field: 'userId', value: user.id },
              { field: 'providerId', value: 'credential' },
            ],
          })

          if (!account || !account.password) {
            throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
          }

          // Verify password
          const isValid = await ctx.context.password.verify(input.password, account.password)
          if (!isValid) {
            throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS')
          }

          // Check email verification if required
          if (requireEmailVerification && !user.emailVerified) {
            throw new AuthenticationError('Email not verified', 'UNAUTHORIZED')
          }

          // Create session
          const session = await ctx.context.internal.adapter.create({
            model: 'session',
            data: {
              userId: user.id,
              expiresAt: new Date(Date.now() + ctx.context.options.session.expiresIn * 1000),
            },
          })

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            session: {
              id: session.id,
              userId: session.userId,
              expiresAt: session.expiresAt,
              token: session.token,
            },
          }
        },
      },

      signOut: {
        method: 'POST',
        handler: async (ctx: any) => {
          const sessionToken = ctx.headers.get('authorization')?.replace('Bearer ', '')

          if (!sessionToken) {
            throw new AuthenticationError('No session token provided', 'UNAUTHORIZED')
          }

          // Delete session
          await ctx.context.internal.adapter.delete({
            model: 'session',
            where: [{ field: 'token', value: sessionToken }],
          })

          return { success: true }
        },
      },

      getSession: {
        method: 'GET',
        handler: async (ctx: any) => {
          const sessionToken = ctx.headers.get('authorization')?.replace('Bearer ', '')

          if (!sessionToken) {
            return null
          }

          // Find session
          const session = await ctx.context.internal.adapter.findOne({
            model: 'session',
            where: [{ field: 'token', value: sessionToken }],
          })

          if (!session) {
            return null
          }

          // Check if expired
          if (new Date(session.expiresAt) < new Date()) {
            // Delete expired session
            await ctx.context.internal.adapter.delete({
              model: 'session',
              where: [{ field: 'id', value: session.id }],
            })
            throw new AuthenticationError('Session expired', 'SESSION_EXPIRED')
          }

          // Get user
          const user = await ctx.context.internal.adapter.findOne({
            model: 'user',
            where: [{ field: 'id', value: session.userId }],
          })

          if (!user) {
            return null
          }

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            session: {
              id: session.id,
              userId: session.userId,
              expiresAt: session.expiresAt,
              token: session.token,
            },
          }
        },
      },
    },
  }
}

/**
 * Helper to validate email
 */
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success
}

/**
 * Helper to validate password
 */
export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success
}

/**
 * Helper to get password validation errors
 */
export function getPasswordErrors(password: string): string[] {
  const result = passwordSchema.safeParse(password)
  if (result.success) return []
  return result.error.errors.map(err => err.message)
}

/**
 * Helper to get email validation errors
 */
export function getEmailErrors(email: string): string[] {
  const result = emailSchema.safeParse(email)
  if (result.success) return []
  return result.error.errors.map(err => err.message)
}
