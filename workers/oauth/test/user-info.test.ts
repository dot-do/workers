/**
 * RED Tests: oauth.do User Info Retrieval
 *
 * These tests define the contract for the oauth.do worker's user info functionality.
 * The OAuthDO must handle user profile retrieval, session management, and user data.
 *
 * Per ARCHITECTURE.md:
 * - oauth.do implements WorkOS AuthKit integration
 * - Handles user info retrieval
 * - Session management
 *
 * RED PHASE: These tests MUST FAIL because OAuthDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-6ebr).
 *
 * @see ARCHITECTURE.md lines 984, 1148-1153, 1340
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockSession,
  createMockUser,
  type MockDOState,
  type MockOAuthEnv,
} from './helpers.js'

/**
 * Interface definition for OAuthDO user info operations
 */
export interface OAuthDOUserContract {
  // User info retrieval
  getUser(userId: string): Promise<UserInfo | null>
  getUserByEmail(email: string): Promise<UserInfo | null>
  getCurrentUser(sessionId: string): Promise<UserInfo | null>

  // Session management
  getSession(sessionId: string): Promise<SessionInfo | null>
  listUserSessions(userId: string): Promise<SessionInfo[]>
  updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<SessionInfo | null>
  deleteSession(sessionId: string): Promise<boolean>

  // User profile updates (via WorkOS)
  updateUserProfile(userId: string, updates: UserProfileUpdate): Promise<UserInfo | null>

  // HTTP fetch handler
  fetch(request: Request): Promise<Response>
}

export interface UserInfo {
  id: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  profilePictureUrl?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export interface SessionInfo {
  id: string
  userId: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
  createdAt: number
  lastActiveAt: number
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export interface UserProfileUpdate {
  firstName?: string
  lastName?: string
  profilePictureUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * Attempt to load OAuthDO - this will fail in RED phase
 */
async function loadOAuthDO(): Promise<new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOUserContract> {
  const module = await import('../src/oauth.js')
  return module.OAuthDO
}

describe('OAuthDO User Info Retrieval', () => {
  let ctx: MockDOState
  let env: MockOAuthEnv
  let OAuthDO: new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOUserContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    OAuthDO = await loadOAuthDO()
  })

  describe('User Retrieval', () => {
    describe('getUser()', () => {
      it('should return user by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUser('user_test123')

        expect(user).not.toBeNull()
        expect(user?.id).toBe('user_test123')
      })

      it('should return full user info', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUser('user_test123')

        expect(user?.email).toBeDefined()
        expect(user?.emailVerified).toBeDefined()
        expect(user?.createdAt).toBeDefined()
        expect(user?.updatedAt).toBeDefined()
      })

      it('should return null for non-existent user', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUser('user_nonexistent')

        expect(user).toBeNull()
      })

      it('should include optional profile fields if available', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUser('user_with_profile')

        // These fields are optional but should be present if set
        if (user?.firstName) {
          expect(typeof user.firstName).toBe('string')
        }
        if (user?.lastName) {
          expect(typeof user.lastName).toBe('string')
        }
        if (user?.profilePictureUrl) {
          expect(user.profilePictureUrl).toMatch(/^https?:\/\//)
        }
      })

      it('should include user metadata if available', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUser('user_with_metadata')

        if (user?.metadata) {
          expect(typeof user.metadata).toBe('object')
        }
      })
    })

    describe('getUserByEmail()', () => {
      it('should return user by email', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUserByEmail('test@example.com')

        expect(user).not.toBeNull()
        expect(user?.email).toBe('test@example.com')
      })

      it('should return null for non-existent email', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUserByEmail('nonexistent@example.com')

        expect(user).toBeNull()
      })

      it('should be case-insensitive for email lookup', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getUserByEmail('TEST@EXAMPLE.COM')

        expect(user).not.toBeNull()
        expect(user?.email.toLowerCase()).toBe('test@example.com')
      })
    })

    describe('getCurrentUser()', () => {
      it('should return user from session', async () => {
        const instance = new OAuthDO(ctx, env)
        // Set up a session
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const user = await instance.getCurrentUser(session.id)

        expect(user).not.toBeNull()
        expect(user?.id).toBe(session.userId)
      })

      it('should return null for invalid session', async () => {
        const instance = new OAuthDO(ctx, env)
        const user = await instance.getCurrentUser('invalid_session_id')

        expect(user).toBeNull()
      })

      it('should return null for expired session', async () => {
        const instance = new OAuthDO(ctx, env)
        const expiredSession = createMockSession({
          expiresAt: Date.now() - 3600000,
        })
        await ctx.storage.put(`session:${expiredSession.id}`, expiredSession)

        const user = await instance.getCurrentUser(expiredSession.id)

        expect(user).toBeNull()
      })
    })
  })

  describe('Session Management', () => {
    describe('getSession()', () => {
      it('should return session by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const retrieved = await instance.getSession(session.id)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.id).toBe(session.id)
      })

      it('should return full session info', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const retrieved = await instance.getSession(session.id)

        expect(retrieved?.userId).toBeDefined()
        expect(retrieved?.accessToken).toBeDefined()
        expect(retrieved?.expiresAt).toBeDefined()
        expect(retrieved?.createdAt).toBeDefined()
        expect(retrieved?.lastActiveAt).toBeDefined()
      })

      it('should return null for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = await instance.getSession('nonexistent_session')

        expect(session).toBeNull()
      })

      it('should not return expired sessions', async () => {
        const instance = new OAuthDO(ctx, env)
        const expiredSession = createMockSession({
          expiresAt: Date.now() - 3600000,
        })
        await ctx.storage.put(`session:${expiredSession.id}`, expiredSession)

        const retrieved = await instance.getSession(expiredSession.id)

        expect(retrieved).toBeNull()
      })
    })

    describe('listUserSessions()', () => {
      it('should return all sessions for user', async () => {
        const instance = new OAuthDO(ctx, env)
        const userId = 'user_with_sessions'

        // Create multiple sessions
        for (let i = 0; i < 3; i++) {
          const session = createMockSession({
            id: `session_${i}`,
            userId,
          })
          await ctx.storage.put(`session:${session.id}`, session)
        }

        const sessions = await instance.listUserSessions(userId)

        expect(sessions.length).toBeGreaterThanOrEqual(3)
        sessions.forEach((s) => {
          expect(s.userId).toBe(userId)
        })
      })

      it('should return empty array for user without sessions', async () => {
        const instance = new OAuthDO(ctx, env)
        const sessions = await instance.listUserSessions('user_no_sessions')

        expect(sessions).toEqual([])
      })

      it('should exclude expired sessions', async () => {
        const instance = new OAuthDO(ctx, env)
        const userId = 'user_mixed_sessions'

        // Create expired and valid sessions
        const expiredSession = createMockSession({
          id: 'expired_session',
          userId,
          expiresAt: Date.now() - 3600000,
        })
        const validSession = createMockSession({
          id: 'valid_session',
          userId,
          expiresAt: Date.now() + 3600000,
        })

        await ctx.storage.put(`session:${expiredSession.id}`, expiredSession)
        await ctx.storage.put(`session:${validSession.id}`, validSession)

        const sessions = await instance.listUserSessions(userId)

        expect(sessions.every((s) => s.expiresAt > Date.now())).toBe(true)
      })

      it('should order sessions by creation date (newest first)', async () => {
        const instance = new OAuthDO(ctx, env)
        const userId = 'user_ordered_sessions'

        const sessions = await instance.listUserSessions(userId)

        for (let i = 1; i < sessions.length; i++) {
          expect(sessions[i - 1].createdAt).toBeGreaterThanOrEqual(sessions[i].createdAt)
        }
      })
    })

    describe('updateSession()', () => {
      it('should update session metadata', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const updated = await instance.updateSession(session.id, {
          metadata: { foo: 'bar' },
        })

        expect(updated).not.toBeNull()
        expect(updated?.metadata).toEqual({ foo: 'bar' })
      })

      it('should update lastActiveAt', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession({
          lastActiveAt: Date.now() - 3600000,
        })
        await ctx.storage.put(`session:${session.id}`, session)

        const now = Date.now()
        const updated = await instance.updateSession(session.id, {
          lastActiveAt: now,
        })

        expect(updated?.lastActiveAt).toBeGreaterThanOrEqual(now - 1000)
      })

      it('should return null for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateSession('nonexistent', {
          metadata: { foo: 'bar' },
        })

        expect(updated).toBeNull()
      })

      it('should not allow updating sensitive fields', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const updated = await instance.updateSession(session.id, {
          // These should not be updateable directly
          accessToken: 'new_token',
          userId: 'different_user',
        } as Partial<SessionInfo>)

        // Original values should be preserved
        expect(updated?.accessToken).toBe(session.accessToken)
        expect(updated?.userId).toBe(session.userId)
      })

      it('should persist updates to storage', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        await instance.updateSession(session.id, {
          metadata: { foo: 'bar' },
        })

        expect(ctx.storage.put).toHaveBeenCalled()
      })
    })

    describe('deleteSession()', () => {
      it('should delete session and return true', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const result = await instance.deleteSession(session.id)

        expect(result).toBe(true)
      })

      it('should return false for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.deleteSession('nonexistent_session')

        expect(result).toBe(false)
      })

      it('should remove session from storage', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        await instance.deleteSession(session.id)

        // Session should no longer be retrievable
        const retrieved = await instance.getSession(session.id)
        expect(retrieved).toBeNull()
      })

      it('should call storage.delete', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        await instance.deleteSession(session.id)

        expect(ctx.storage.delete).toHaveBeenCalled()
      })
    })
  })

  describe('User Profile Updates', () => {
    describe('updateUserProfile()', () => {
      it('should update user first name', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateUserProfile('user_test123', {
          firstName: 'NewFirstName',
        })

        expect(updated).not.toBeNull()
        expect(updated?.firstName).toBe('NewFirstName')
      })

      it('should update user last name', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateUserProfile('user_test123', {
          lastName: 'NewLastName',
        })

        expect(updated).not.toBeNull()
        expect(updated?.lastName).toBe('NewLastName')
      })

      it('should update profile picture URL', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateUserProfile('user_test123', {
          profilePictureUrl: 'https://example.com/new-avatar.png',
        })

        expect(updated).not.toBeNull()
        expect(updated?.profilePictureUrl).toBe('https://example.com/new-avatar.png')
      })

      it('should update user metadata', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateUserProfile('user_test123', {
          metadata: { customField: 'customValue' },
        })

        expect(updated).not.toBeNull()
        expect(updated?.metadata).toEqual({ customField: 'customValue' })
      })

      it('should return null for non-existent user', async () => {
        const instance = new OAuthDO(ctx, env)
        const updated = await instance.updateUserProfile('user_nonexistent', {
          firstName: 'Test',
        })

        expect(updated).toBeNull()
      })

      it('should update updatedAt timestamp', async () => {
        const instance = new OAuthDO(ctx, env)
        const before = new Date().toISOString()

        const updated = await instance.updateUserProfile('user_test123', {
          firstName: 'Test',
        })

        expect(updated?.updatedAt).toBeDefined()
        expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime() - 1000)
      })

      it('should not allow updating email', async () => {
        const instance = new OAuthDO(ctx, env)
        const original = await instance.getUser('user_test123')

        const updated = await instance.updateUserProfile('user_test123', {
          email: 'new@example.com',
        } as UserProfileUpdate & { email: string })

        // Email should remain unchanged (managed by WorkOS)
        expect(updated?.email).toBe(original?.email)
      })
    })
  })

  describe('HTTP fetch() handler - User endpoints', () => {
    describe('GET /userinfo', () => {
      it('should return current user info from token', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/userinfo', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as UserInfo
        expect(data.id).toBeDefined()
        expect(data.email).toBeDefined()
      })

      it('should return 401 for missing Authorization header', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/userinfo', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(401)
      })

      it('should return 401 for invalid token', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/userinfo', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid_token',
          },
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(401)
      })

      it('should include OIDC standard claims', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/userinfo', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        const data = (await response.json()) as Record<string, unknown>

        // Standard OIDC claims
        expect(data.sub).toBeDefined() // Subject (user ID)
        expect(data.email).toBeDefined()
        expect(data.email_verified).toBeDefined()
      })
    })

    describe('GET /api/users/:id', () => {
      it('should return user by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/users/user_test123', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as UserInfo
        expect(data.id).toBe('user_test123')
      })

      it('should return 404 for non-existent user', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/users/user_nonexistent', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('PATCH /api/users/:id', () => {
      it('should update user profile', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/users/user_test123', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: 'UpdatedName' }),
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as UserInfo
        expect(data.firstName).toBe('UpdatedName')
      })

      it('should return 404 for non-existent user', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/users/user_nonexistent', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: 'Test' }),
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('GET /api/sessions', () => {
      it('should list sessions for authenticated user', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/sessions', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as SessionInfo[]
        expect(Array.isArray(data)).toBe(true)
      })

      it('should return 401 for unauthenticated request', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/sessions', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(401)
      })
    })

    describe('GET /api/sessions/:id', () => {
      it('should return session by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const request = new Request(`https://oauth.do/api/sessions/${session.id}`, {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as SessionInfo
        expect(data.id).toBe(session.id)
      })

      it('should return 404 for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/sessions/nonexistent', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('DELETE /api/sessions/:id', () => {
      it('should delete session', async () => {
        const instance = new OAuthDO(ctx, env)
        const session = createMockSession()
        await ctx.storage.put(`session:${session.id}`, session)

        const request = new Request(`https://oauth.do/api/sessions/${session.id}`, {
          method: 'DELETE',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
      })

      it('should return 404 for non-existent session', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/sessions/nonexistent', {
          method: 'DELETE',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/', { method: 'GET' })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as Record<string, unknown>
        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
      })

      it('should include OAuth endpoints in discovery', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/', { method: 'GET' })

        const response = await instance.fetch(request)
        const data = (await response.json()) as {
          links: Record<string, string>
        }

        expect(data.links.authorize).toBeDefined()
        expect(data.links.token).toBeDefined()
        expect(data.links.userinfo).toBeDefined()
        expect(data.links.logout).toBeDefined()
      })

      it('should include OpenID configuration endpoint', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/.well-known/openid-configuration', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as Record<string, unknown>
        expect(data.issuer).toBeDefined()
        expect(data.authorization_endpoint).toBeDefined()
        expect(data.token_endpoint).toBeDefined()
        expect(data.userinfo_endpoint).toBeDefined()
      })
    })
  })
})
