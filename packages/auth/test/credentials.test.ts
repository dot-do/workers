import { describe, it, expect, beforeEach } from 'vitest'
import {
  signupSchema,
  loginSchema,
  emailSchema,
  passwordSchema,
  validateEmail,
  validatePassword,
  getEmailErrors,
  getPasswordErrors,
  AuthenticationError,
  ValidationError,
  credentialsAuth,
  type SignupInput,
  type LoginInput,
} from '../src/credentials.js'

describe('Email/Password Authentication', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
      ]

      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true)
        expect(emailSchema.safeParse(email).success).toBe(true)
      }
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
        'a@b',
      ]

      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false)
        expect(emailSchema.safeParse(email).success).toBe(false)
      }
    })

    it('should trim and lowercase emails', () => {
      const result = emailSchema.parse('  User@Example.COM  ')
      expect(result).toBe('user@example.com')
    })

    it('should enforce email length limits', () => {
      expect(validateEmail('ab')).toBe(false) // Too short
      expect(validateEmail('a'.repeat(250) + '@example.com')).toBe(false) // Too long
    })

    it('should return validation errors for invalid emails', () => {
      const errors = getEmailErrors('invalid')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('Invalid email')
    })

    it('should return no errors for valid emails', () => {
      const errors = getEmailErrors('user@example.com')
      expect(errors).toEqual([])
    })
  })

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyP@ssw0rd',
        'C0mplex!Pass',
        'Str0ng&Secure',
      ]

      for (const password of strongPasswords) {
        expect(validatePassword(password)).toBe(true)
        expect(passwordSchema.safeParse(password).success).toBe(true)
      }
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',           // Too short
        'nouppercase1!',   // No uppercase
        'NOLOWERCASE1!',   // No lowercase
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        'password',        // Weak overall
      ]

      for (const password of weakPasswords) {
        expect(validatePassword(password)).toBe(false)
      }
    })

    it('should require minimum 8 characters', () => {
      expect(validatePassword('Pass1!')).toBe(false)
      expect(validatePassword('Pass12!a')).toBe(true)
    })

    it('should require uppercase letter', () => {
      expect(validatePassword('password123!')).toBe(false)
      expect(validatePassword('Password123!')).toBe(true)
    })

    it('should require lowercase letter', () => {
      expect(validatePassword('PASSWORD123!')).toBe(false)
      expect(validatePassword('Password123!')).toBe(true)
    })

    it('should require number', () => {
      expect(validatePassword('Password!')).toBe(false)
      expect(validatePassword('Password1!')).toBe(true)
    })

    it('should require special character', () => {
      expect(validatePassword('Password123')).toBe(false)
      expect(validatePassword('Password123!')).toBe(true)
    })

    it('should enforce maximum length', () => {
      const longPassword = 'P@ssw0rd' + 'a'.repeat(130)
      expect(validatePassword(longPassword)).toBe(false)
    })

    it('should return validation errors for weak passwords', () => {
      const errors = getPasswordErrors('weak')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('8 characters'))).toBe(true)
    })

    it('should return all password requirement errors', () => {
      const errors = getPasswordErrors('weak')
      expect(errors.length).toBeGreaterThanOrEqual(4) // Missing upper, number, special, length
    })

    it('should return no errors for strong passwords', () => {
      const errors = getPasswordErrors('StrongP@ss123')
      expect(errors).toEqual([])
    })
  })

  describe('Signup Schema Validation', () => {
    it('should accept valid signup input', () => {
      const input: SignupInput = {
        email: 'user@example.com',
        password: 'StrongP@ss123',
        name: 'John Doe',
      }

      const result = signupSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.name).toBe('John Doe')
      }
    })

    it('should accept signup without name', () => {
      const input = {
        email: 'user@example.com',
        password: 'StrongP@ss123',
      }

      const result = signupSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject signup with invalid email', () => {
      const input = {
        email: 'invalid-email',
        password: 'StrongP@ss123',
      }

      const result = signupSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject signup with weak password', () => {
      const input = {
        email: 'user@example.com',
        password: 'weak',
      }

      const result = signupSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should trim name field', () => {
      const input = {
        email: 'user@example.com',
        password: 'StrongP@ss123',
        name: '  John Doe  ',
      }

      const result = signupSchema.parse(input)
      expect(result.name).toBe('John Doe')
    })
  })

  describe('Login Schema Validation', () => {
    it('should accept valid login input', () => {
      const input: LoginInput = {
        email: 'user@example.com',
        password: 'anypassword',
      }

      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject login with invalid email', () => {
      const input = {
        email: 'invalid',
        password: 'password',
      }

      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject login with empty password', () => {
      const input = {
        email: 'user@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should not validate password strength on login', () => {
      // Login should accept any non-empty password
      // Password strength is only validated on signup
      const input = {
        email: 'user@example.com',
        password: 'weak',
      }

      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('Authentication Errors', () => {
    it('should create AuthenticationError with code', () => {
      const error = new AuthenticationError('Test error', 'INVALID_CREDENTIALS')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthenticationError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('INVALID_CREDENTIALS')
      expect(error.name).toBe('AuthenticationError')
    })

    it('should support all error codes', () => {
      const codes = [
        'INVALID_CREDENTIALS',
        'USER_EXISTS',
        'VALIDATION_ERROR',
        'SESSION_EXPIRED',
        'UNAUTHORIZED',
      ] as const

      for (const code of codes) {
        const error = new AuthenticationError('Test', code)
        expect(error.code).toBe(code)
      }
    })
  })

  describe('Validation Errors', () => {
    it('should create ValidationError with field errors', () => {
      const fieldErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too weak' },
      ]

      const error = new ValidationError('Validation failed', fieldErrors)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Validation failed')
      expect(error.errors).toEqual(fieldErrors)
      expect(error.name).toBe('ValidationError')
    })

    it('should handle empty errors array', () => {
      const error = new ValidationError('Validation failed', [])
      expect(error.errors).toEqual([])
    })
  })

  describe('Credentials Auth Plugin', () => {
    it('should create plugin with default config', () => {
      const plugin = credentialsAuth()
      expect(plugin).toBeDefined()
      expect(plugin.id).toBe('credentials')
      expect(plugin.endpoints).toBeDefined()
      expect(plugin.endpoints.signUp).toBeDefined()
      expect(plugin.endpoints.signIn).toBeDefined()
      expect(plugin.endpoints.signOut).toBeDefined()
      expect(plugin.endpoints.getSession).toBeDefined()
    })

    it('should create plugin with custom config', () => {
      const plugin = credentialsAuth({
        requireEmailVerification: true,
        validateSignup: async (input) => {
          if (input.email.endsWith('@blocked.com')) {
            throw new Error('Blocked domain')
          }
        },
      })

      expect(plugin).toBeDefined()
      expect(plugin.id).toBe('credentials')
    })

    it('should have correct endpoint methods', () => {
      const plugin = credentialsAuth()
      expect(plugin.endpoints.signUp.method).toBe('POST')
      expect(plugin.endpoints.signIn.method).toBe('POST')
      expect(plugin.endpoints.signOut.method).toBe('POST')
      expect(plugin.endpoints.getSession.method).toBe('GET')
    })
  })

  describe('Edge Cases', () => {
    it('should handle unicode characters in name', () => {
      const input = {
        email: 'user@example.com',
        password: 'StrongP@ss123',
        name: '张伟',
      }

      const result = signupSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should handle special characters in email local part', () => {
      const emails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
      ]

      for (const email of emails) {
        expect(validateEmail(email)).toBe(true)
      }
    })

    it('should handle various special characters in password', () => {
      const passwords = [
        'Pass123!@#',
        'Pass123$%^',
        'Pass123&*()',
        'Pass123-_=+',
      ]

      for (const password of passwords) {
        expect(validatePassword(password)).toBe(true)
      }
    })

    it('should normalize email case consistently', () => {
      const emails = ['User@Example.COM', 'user@example.com', 'USER@EXAMPLE.COM']
      const normalized = emails.map(e => emailSchema.parse(e))

      expect(normalized.every(e => e === 'user@example.com')).toBe(true)
    })
  })

  describe('Security Requirements', () => {
    it('should require all password complexity rules', () => {
      // Missing uppercase
      expect(validatePassword('password123!')).toBe(false)

      // Missing lowercase
      expect(validatePassword('PASSWORD123!')).toBe(false)

      // Missing number
      expect(validatePassword('Password!')).toBe(false)

      // Missing special char
      expect(validatePassword('Password123')).toBe(false)

      // Too short
      expect(validatePassword('Pass1!')).toBe(false)

      // All requirements met
      expect(validatePassword('Password123!')).toBe(true)
    })

    it('should enforce minimum email length', () => {
      expect(validateEmail('a@b')).toBe(false) // Too short, missing TLD
      expect(validateEmail('x@y.co')).toBe(true) // Valid short email
    })

    it('should prevent SQL injection in email', () => {
      const maliciousEmails = [
        "'; DROP TABLE users; --",
        "admin'--",
        "' OR '1'='1",
      ]

      for (const email of maliciousEmails) {
        expect(validateEmail(email)).toBe(false)
      }
    })
  })

  describe('Validation Error Messages', () => {
    it('should provide helpful error messages for email', () => {
      const errors = getEmailErrors('')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.toLowerCase().includes('email'))).toBe(true)
    })

    it('should provide helpful error messages for password', () => {
      const errors = getPasswordErrors('weak')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.toLowerCase().includes('character'))).toBe(true)
    })

    it('should list all missing password requirements', () => {
      const errors = getPasswordErrors('abc')
      expect(errors.length).toBeGreaterThanOrEqual(4)
      expect(errors.some(e => e.includes('uppercase'))).toBe(true)
      expect(errors.some(e => e.includes('number'))).toBe(true)
      expect(errors.some(e => e.includes('special'))).toBe(true)
      expect(errors.some(e => e.includes('8 characters'))).toBe(true)
    })
  })
})
