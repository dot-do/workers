/**
 * RED Tests: oauth.do Token Exchange
 *
 * These tests define the contract for the oauth.do worker's token exchange functionality.
 * The OAuthDO must handle token operations: refresh, revocation, and validation.
 *
 * Per ARCHITECTURE.md:
 * - oauth.do implements WorkOS AuthKit integration
 * - Handles token exchange and refresh
 * - Session management
 *
 * RED PHASE: These tests MUST FAIL because OAuthDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-6ebr).
 *
 * @see ARCHITECTURE.md lines 984, 1148-1153, 1340
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv, createMockSession, } from './helpers.js';
/**
 * Attempt to load OAuthDO - this will fail in RED phase
 */
async function loadOAuthDO() {
    const module = await import('../src/oauth.js');
    return module.OAuthDO;
}
describe('OAuthDO Token Exchange', () => {
    let ctx;
    let env;
    let OAuthDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        // This will throw in RED phase because the module doesn't exist
        OAuthDO = await loadOAuthDO();
    });
    describe('Token Refresh', () => {
        describe('refreshAccessToken()', () => {
            it('should exchange refresh token for new access token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('valid_refresh_token');
                expect(result.success).toBe(true);
                expect(result.accessToken).toBeDefined();
                expect(result.accessToken?.length).toBeGreaterThan(0);
            });
            it('should return new refresh token if rotated', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('valid_refresh_token');
                // Refresh token may be rotated (security best practice)
                if (result.refreshToken) {
                    expect(result.refreshToken).not.toBe('valid_refresh_token');
                }
            });
            it('should return expiration time', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('valid_refresh_token');
                expect(result.expiresIn).toBeDefined();
                expect(result.expiresIn).toBeGreaterThan(0);
            });
            it('should return token type (Bearer)', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('valid_refresh_token');
                expect(result.tokenType).toBe('Bearer');
            });
            it('should reject invalid refresh token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('invalid_refresh_token');
                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
                expect(result.error).toMatch(/invalid|expired|revoked/i);
            });
            it('should reject expired refresh token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.refreshAccessToken('expired_refresh_token');
                expect(result.success).toBe(false);
                expect(result.error).toMatch(/expired/i);
            });
            it('should reject revoked refresh token', async () => {
                const instance = new OAuthDO(ctx, env);
                // First revoke the token
                await instance.revokeToken('refresh_to_revoke', 'refresh_token');
                // Then try to use it
                const result = await instance.refreshAccessToken('refresh_to_revoke');
                expect(result.success).toBe(false);
                expect(result.error).toMatch(/revoked|invalid/i);
            });
            it('should update stored session with new tokens', async () => {
                const instance = new OAuthDO(ctx, env);
                await instance.refreshAccessToken('valid_refresh_token');
                // Storage should be updated with new token info
                expect(ctx.storage.put).toHaveBeenCalled();
            });
        });
    });
    describe('Token Validation', () => {
        describe('validateAccessToken()', () => {
            it('should return valid for active token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('valid_access_token');
                expect(result.valid).toBe(true);
            });
            it('should return user ID for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('valid_access_token');
                expect(result.userId).toBeDefined();
            });
            it('should return email for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('valid_access_token');
                expect(result.email).toBeDefined();
            });
            it('should return scopes for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('valid_access_token');
                expect(Array.isArray(result.scopes)).toBe(true);
            });
            it('should return expiration time for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('valid_access_token');
                expect(result.expiresAt).toBeDefined();
                expect(result.expiresAt).toBeGreaterThan(Date.now());
            });
            it('should return invalid for expired token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('expired_access_token');
                expect(result.valid).toBe(false);
                expect(result.error).toMatch(/expired/i);
            });
            it('should return invalid for malformed token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('malformed-token-garbage');
                expect(result.valid).toBe(false);
                expect(result.error).toMatch(/invalid|malformed/i);
            });
            it('should return invalid for revoked token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.validateAccessToken('revoked_access_token');
                expect(result.valid).toBe(false);
                expect(result.error).toMatch(/revoked/i);
            });
        });
        describe('introspectToken()', () => {
            it('should return active true for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.active).toBe(true);
            });
            it('should return subject (user ID) for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.sub).toBeDefined();
            });
            it('should return client ID for valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.clientId).toBeDefined();
            });
            it('should return token type', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.tokenType).toBe('Bearer');
            });
            it('should return issued at timestamp', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.iat).toBeDefined();
                expect(result.iat).toBeLessThan(Date.now() / 1000);
            });
            it('should return expiration timestamp', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.exp).toBeDefined();
            });
            it('should return issuer', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                expect(result.iss).toBeDefined();
            });
            it('should return scope as space-separated string', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('valid_access_token');
                if (result.scope) {
                    expect(typeof result.scope).toBe('string');
                }
            });
            it('should return active false for invalid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('invalid_token');
                expect(result.active).toBe(false);
            });
            it('should return minimal info for invalid token (per RFC 7662)', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.introspectToken('invalid_token');
                // Per RFC 7662, inactive tokens should only return { active: false }
                expect(result.active).toBe(false);
                // Other fields should not reveal information about invalid tokens
            });
        });
    });
    describe('Token Revocation', () => {
        describe('revokeToken()', () => {
            it('should successfully revoke access token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.revokeToken('access_token_to_revoke', 'access_token');
                expect(result.success).toBe(true);
            });
            it('should successfully revoke refresh token', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.revokeToken('refresh_token_to_revoke', 'refresh_token');
                expect(result.success).toBe(true);
            });
            it('should revoke without hint (auto-detect type)', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.revokeToken('some_token_to_revoke');
                expect(result.success).toBe(true);
            });
            it('should return success even for invalid token (per RFC 7009)', async () => {
                const instance = new OAuthDO(ctx, env);
                // RFC 7009 says revocation should always succeed (idempotent)
                const result = await instance.revokeToken('already_invalid_token');
                expect(result.success).toBe(true);
            });
            it('should make token invalid after revocation', async () => {
                const instance = new OAuthDO(ctx, env);
                await instance.revokeToken('access_token_to_check', 'access_token');
                const validation = await instance.validateAccessToken('access_token_to_check');
                expect(validation.valid).toBe(false);
            });
            it('should also revoke associated refresh token when revoking access token', async () => {
                const instance = new OAuthDO(ctx, env);
                await instance.revokeToken('access_with_refresh', 'access_token');
                // Associated refresh token should also be invalid
                const refreshResult = await instance.refreshAccessToken('associated_refresh_token');
                expect(refreshResult.success).toBe(false);
            });
            it('should update storage to mark token as revoked', async () => {
                const instance = new OAuthDO(ctx, env);
                await instance.revokeToken('token_to_revoke');
                expect(ctx.storage.put).toHaveBeenCalled();
            });
        });
        describe('revokeAllUserTokens()', () => {
            it('should revoke all tokens for user', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.revokeAllUserTokens('user_with_multiple_tokens');
                expect(result.success).toBe(true);
                expect(result.tokensRevoked).toBeDefined();
                expect(result.tokensRevoked).toBeGreaterThan(0);
            });
            it('should return success with zero tokens for user without tokens', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.revokeAllUserTokens('user_without_tokens');
                expect(result.success).toBe(true);
                expect(result.tokensRevoked).toBe(0);
            });
            it('should invalidate all sessions for user', async () => {
                const instance = new OAuthDO(ctx, env);
                await instance.revokeAllUserTokens('user_to_logout');
                // Storage should be updated
                expect(ctx.storage.delete).toHaveBeenCalled();
            });
        });
    });
    describe('Session-Token Exchange', () => {
        describe('exchangeSessionForToken()', () => {
            it('should exchange valid session for access token', async () => {
                const instance = new OAuthDO(ctx, env);
                // First set up a session in storage
                const session = createMockSession();
                await ctx.storage.put(`session:${session.id}`, session);
                const result = await instance.exchangeSessionForToken(session.id);
                expect(result.success).toBe(true);
                expect(result.accessToken).toBeDefined();
            });
            it('should return token type (Bearer)', async () => {
                const instance = new OAuthDO(ctx, env);
                const session = createMockSession();
                await ctx.storage.put(`session:${session.id}`, session);
                const result = await instance.exchangeSessionForToken(session.id);
                expect(result.tokenType).toBe('Bearer');
            });
            it('should return expiration time', async () => {
                const instance = new OAuthDO(ctx, env);
                const session = createMockSession();
                await ctx.storage.put(`session:${session.id}`, session);
                const result = await instance.exchangeSessionForToken(session.id);
                expect(result.expiresIn).toBeDefined();
                expect(result.expiresIn).toBeGreaterThan(0);
            });
            it('should reject invalid session ID', async () => {
                const instance = new OAuthDO(ctx, env);
                const result = await instance.exchangeSessionForToken('invalid_session_id');
                expect(result.success).toBe(false);
                expect(result.error).toMatch(/session|not found|invalid/i);
            });
            it('should reject expired session', async () => {
                const instance = new OAuthDO(ctx, env);
                const expiredSession = createMockSession({
                    expiresAt: Date.now() - 3600000, // 1 hour ago
                });
                await ctx.storage.put(`session:${expiredSession.id}`, expiredSession);
                const result = await instance.exchangeSessionForToken(expiredSession.id);
                expect(result.success).toBe(false);
                expect(result.error).toMatch(/expired/i);
            });
        });
    });
    describe('HTTP fetch() handler - Token endpoints', () => {
        describe('POST /token', () => {
            it('should handle refresh_token grant type', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: 'valid_refresh_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.accessToken).toBeDefined();
            });
            it('should return error for missing grant_type', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: '',
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const data = (await response.json());
                expect(data.error).toBe('invalid_request');
            });
            it('should return error for unsupported grant_type', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'unsupported_grant',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const data = (await response.json());
                expect(data.error).toBe('unsupported_grant_type');
            });
            it('should return proper OAuth error format', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: 'invalid_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const data = (await response.json());
                expect(data.error).toBeDefined();
                // error_description is optional per OAuth spec
            });
        });
        describe('POST /token/introspect', () => {
            it('should introspect valid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/introspect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: 'valid_access_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.active).toBe(true);
            });
            it('should return inactive for invalid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/introspect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: 'invalid_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200); // Per RFC 7662, always 200
                const data = (await response.json());
                expect(data.active).toBe(false);
            });
            it('should return 400 for missing token parameter', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/introspect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: '',
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
            });
        });
        describe('POST /token/revoke', () => {
            it('should revoke token', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: 'token_to_revoke',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
            it('should support token_type_hint', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: 'token_to_revoke',
                        token_type_hint: 'refresh_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
            it('should return 200 for invalid token (per RFC 7009)', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        token: 'already_invalid_token',
                    }).toString(),
                });
                const response = await instance.fetch(request);
                // Per RFC 7009, revocation is idempotent
                expect(response.status).toBe(200);
            });
            it('should return 400 for missing token parameter', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: '',
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
            });
        });
        describe('GET /token/validate', () => {
            it('should validate token from Authorization header', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/validate', {
                    method: 'GET',
                    headers: {
                        Authorization: 'Bearer valid_access_token',
                    },
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.valid).toBe(true);
            });
            it('should return 401 for invalid token', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/validate', {
                    method: 'GET',
                    headers: {
                        Authorization: 'Bearer invalid_token',
                    },
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(401);
            });
            it('should return 401 for missing Authorization header', async () => {
                const instance = new OAuthDO(ctx, env);
                const request = new Request('https://oauth.do/token/validate', {
                    method: 'GET',
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(401);
            });
        });
    });
});
