/**
 * RED Tests: deployer.do Cloudflare API Integration
 *
 * These tests define the contract for the deployer worker's Cloudflare API integration.
 * The DeployerDO must integrate with the Cloudflare Workers API for deployment operations.
 *
 * Per issue description:
 * - Cloudflare API integration
 * - Authenticate and communicate with CF API
 * - Handle API errors appropriately
 *
 * RED PHASE: These tests MUST FAIL because DeployerDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hg7p).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockState, createMockEnv, createMockCloudflareAPI, } from './helpers.js';
/**
 * Attempt to load DeployerDO - this will fail in RED phase
 */
async function loadDeployerDO() {
    const module = await import('../src/deployer.js');
    return module.DeployerDO;
}
describe('DeployerDO Cloudflare API Integration', () => {
    let ctx;
    let env;
    let DeployerDO;
    let mockCloudflareApi;
    beforeEach(async () => {
        ctx = createMockState();
        mockCloudflareApi = createMockCloudflareAPI();
        env = createMockEnv({ cloudflareApi: mockCloudflareApi });
        DeployerDO = await loadDeployerDO();
    });
    describe('setCloudflareCredentials() - Configure API access', () => {
        it('should accept API token', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setCloudflareCredentials({
                apiToken: 'test-api-token',
            });
            const status = await instance.getCloudflareStatus();
            expect(status.authenticated).toBe(true);
            expect(status.apiType).toBe('token');
        });
        it('should accept API key with email', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setCloudflareCredentials({
                apiKey: 'test-api-key',
                email: 'test@example.com',
            });
            const status = await instance.getCloudflareStatus();
            expect(status.authenticated).toBe(true);
            expect(status.apiType).toBe('key');
        });
        it('should reject API key without email', async () => {
            const instance = new DeployerDO(ctx, env);
            await expect(instance.setCloudflareCredentials({
                apiKey: 'test-api-key',
            })).rejects.toThrow(/email required|missing email/i);
        });
        it('should update credentials when called again', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setCloudflareCredentials({ apiToken: 'token-1' });
            let status = await instance.getCloudflareStatus();
            expect(status.authenticated).toBe(true);
            await instance.setCloudflareCredentials({ apiToken: 'token-2' });
            status = await instance.getCloudflareStatus();
            expect(status.authenticated).toBe(true);
        });
    });
    describe('getCloudflareStatus() - Check API status', () => {
        it('should return unauthenticated status by default', async () => {
            const instance = new DeployerDO(ctx, env);
            // Clear default credentials
            env.CLOUDFLARE_API_TOKEN = '';
            const status = await instance.getCloudflareStatus();
            expect(status.authenticated).toBe(false);
            expect(status.apiType).toBe('none');
            expect(status.accountId).toBeNull();
        });
        it('should return permissions when authenticated', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setCloudflareCredentials({ apiToken: 'valid-token' });
            const status = await instance.getCloudflareStatus();
            expect(status.permissions).toBeInstanceOf(Array);
            expect(status.permissions.length).toBeGreaterThan(0);
        });
        it('should include last checked timestamp', async () => {
            const instance = new DeployerDO(ctx, env);
            const status = await instance.getCloudflareStatus();
            expect(status.lastChecked).toBeDefined();
            expect(new Date(status.lastChecked).getTime()).toBeLessThanOrEqual(Date.now());
        });
    });
    describe('listAccounts() - List available accounts', () => {
        it('should list all accessible accounts', async () => {
            const instance = new DeployerDO(ctx, env);
            const accounts = await instance.listAccounts();
            expect(accounts).toBeInstanceOf(Array);
            accounts.forEach(account => {
                expect(account.id).toBeDefined();
                expect(account.name).toBeDefined();
                expect(account.type).toBeDefined();
            });
        });
        it('should return empty array when unauthenticated', async () => {
            const instance = new DeployerDO(ctx, env);
            env.CLOUDFLARE_API_TOKEN = '';
            const accounts = await instance.listAccounts();
            expect(accounts).toEqual([]);
        });
    });
    describe('setActiveAccount() - Set working account', () => {
        it('should set the active account ID', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setActiveAccount('account-123');
            const status = await instance.getCloudflareStatus();
            expect(status.accountId).toBe('account-123');
        });
        it('should validate account ID exists', async () => {
            const instance = new DeployerDO(ctx, env);
            await expect(instance.setActiveAccount('invalid-account'))
                .rejects.toThrow(/account.*not found|invalid account/i);
        });
    });
    describe('getActiveAccount() - Get current account', () => {
        it('should return the active account', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setActiveAccount('account-123');
            const account = await instance.getActiveAccount();
            expect(account).not.toBeNull();
            expect(account.id).toBe('account-123');
        });
        it('should return null when no account is set', async () => {
            const instance = new DeployerDO(ctx, env);
            const account = await instance.getActiveAccount();
            // Might use default from env or return null
            expect(account === null || account.id === env.CLOUDFLARE_ACCOUNT_ID).toBe(true);
        });
    });
    describe('listNamespaces() - Workers for Platforms', () => {
        it('should list dispatch namespaces', async () => {
            const instance = new DeployerDO(ctx, env);
            const namespaces = await instance.listNamespaces();
            expect(namespaces).toBeInstanceOf(Array);
            namespaces.forEach(ns => {
                expect(ns.id).toBeDefined();
                expect(ns.name).toBeDefined();
                expect(typeof ns.scriptCount).toBe('number');
            });
        });
        it('should return empty array when no namespaces exist', async () => {
            const instance = new DeployerDO(ctx, env);
            const namespaces = await instance.listNamespaces();
            expect(Array.isArray(namespaces)).toBe(true);
        });
    });
    describe('createNamespace() - Create dispatch namespace', () => {
        it('should create a new namespace', async () => {
            const instance = new DeployerDO(ctx, env);
            const namespace = await instance.createNamespace('test-namespace');
            expect(namespace.id).toBeDefined();
            expect(namespace.name).toBe('test-namespace');
            expect(namespace.scriptCount).toBe(0);
        });
        it('should reject duplicate namespace names', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.createNamespace('unique-namespace');
            await expect(instance.createNamespace('unique-namespace'))
                .rejects.toThrow(/already exists|duplicate/i);
        });
    });
    describe('API error handling', () => {
        it('should handle authentication errors', async () => {
            const instance = new DeployerDO(ctx, env);
            // Set invalid token
            await instance.setCloudflareCredentials({ apiToken: 'invalid-token' });
            // Mock API to reject
            vi.mocked(mockCloudflareApi.workers.scripts.list).mockRejectedValueOnce(new Error('Authentication error: Invalid API token'));
            await expect(instance.callCloudflareApi('/workers/scripts'))
                .rejects.toThrow(/authentication|invalid.*token|unauthorized/i);
        });
        it('should handle rate limiting', async () => {
            const instance = new DeployerDO(ctx, env);
            // Mock rate limit response
            vi.mocked(mockCloudflareApi.workers.scripts.list).mockRejectedValueOnce(Object.assign(new Error('Rate limit exceeded'), { status: 429 }));
            await expect(instance.callCloudflareApi('/workers/scripts'))
                .rejects.toThrow(/rate limit|too many requests/i);
        });
        it('should handle API unavailability', async () => {
            const instance = new DeployerDO(ctx, env);
            // Mock service unavailable
            vi.mocked(mockCloudflareApi.workers.scripts.list).mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), { status: 503 }));
            await expect(instance.callCloudflareApi('/workers/scripts'))
                .rejects.toThrow(/unavailable|service error|503/i);
        });
        it('should retry on transient failures', async () => {
            const instance = new DeployerDO(ctx, env);
            let attempts = 0;
            vi.mocked(mockCloudflareApi.workers.scripts.list).mockImplementation(async () => {
                attempts++;
                if (attempts < 3) {
                    throw Object.assign(new Error('Temporary error'), { status: 500 });
                }
                return [];
            });
            // Should eventually succeed after retries
            const result = await instance.callCloudflareApi('/workers/scripts');
            expect(Array.isArray(result)).toBe(true);
            expect(attempts).toBe(3);
        });
        it('should not expose API token in error messages', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.setCloudflareCredentials({ apiToken: 'super-secret-token' });
            vi.mocked(mockCloudflareApi.workers.scripts.list).mockRejectedValueOnce(new Error('API error with token: super-secret-token'));
            try {
                await instance.callCloudflareApi('/workers/scripts');
                expect.fail('Should have thrown');
            }
            catch (error) {
                expect(error.message).not.toContain('super-secret-token');
            }
        });
    });
    describe('callCloudflareApi() - Direct API access', () => {
        it('should make GET requests', async () => {
            const instance = new DeployerDO(ctx, env);
            const result = await instance.callCloudflareApi('/zones');
            expect(result).toBeDefined();
        });
        it('should make POST requests with body', async () => {
            const instance = new DeployerDO(ctx, env);
            const result = await instance.callCloudflareApi('/workers/scripts', {
                method: 'POST',
                body: { name: 'test-script', content: 'export default {}' },
            });
            expect(result).toBeDefined();
        });
        it('should include custom headers', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.callCloudflareApi('/test', {
                headers: { 'X-Custom-Header': 'custom-value' },
            });
            // Verify header was passed (implementation dependent)
        });
    });
    describe('Script upload with Cloudflare API', () => {
        it('should upload script via Cloudflare API', async () => {
            const instance = new DeployerDO(ctx, env);
            const script = await instance.uploadScript({
                scriptName: 'cf-api-worker',
                content: 'export default { fetch() { return new Response("Hello") } }',
            });
            expect(script.name).toBe('cf-api-worker');
            expect(mockCloudflareApi.workers.scripts.create).toHaveBeenCalled();
        });
        it('should handle upload errors gracefully', async () => {
            const instance = new DeployerDO(ctx, env);
            vi.mocked(mockCloudflareApi.workers.scripts.create).mockRejectedValueOnce(new Error('Script size exceeds limit'));
            await expect(instance.uploadScript({
                scriptName: 'large-worker',
                content: 'x'.repeat(10 * 1024 * 1024), // 10MB
            })).rejects.toThrow(/size|limit/i);
        });
    });
    describe('Deployment with Cloudflare API', () => {
        it('should deploy via Cloudflare API', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'deploy-api-worker',
                content: 'export default {}',
            });
            const deployment = await instance.deploy({
                scriptName: 'deploy-api-worker',
                versionId: 'v1',
            });
            expect(deployment.deploymentId).toBeDefined();
            expect(mockCloudflareApi.workers.deployments.create).toHaveBeenCalled();
        });
        it('should pass deployment options to API', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'gradual-api-worker',
                content: 'export default {}',
            });
            await instance.deploy({
                scriptName: 'gradual-api-worker',
                versionId: 'v1',
                strategy: 'gradual',
                percentage: 50,
            });
            expect(mockCloudflareApi.workers.deployments.create).toHaveBeenCalledWith(expect.objectContaining({
                scriptName: 'gradual-api-worker',
            }));
        });
    });
    describe('HTTP endpoints for Cloudflare integration', () => {
        it('should handle GET /api/cloudflare/status', async () => {
            const instance = new DeployerDO(ctx, env);
            const request = new Request('http://deployer.do/api/cloudflare/status', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const status = await response.json();
            expect(status).toHaveProperty('authenticated');
            expect(status).toHaveProperty('apiType');
        });
        it('should handle GET /api/cloudflare/accounts', async () => {
            const instance = new DeployerDO(ctx, env);
            const request = new Request('http://deployer.do/api/cloudflare/accounts', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const accounts = await response.json();
            expect(Array.isArray(accounts)).toBe(true);
        });
        it('should handle POST /api/cloudflare/credentials', async () => {
            const instance = new DeployerDO(ctx, env);
            const request = new Request('http://deployer.do/api/cloudflare/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiToken: 'new-token' }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
        });
        it('should handle GET /api/cloudflare/namespaces', async () => {
            const instance = new DeployerDO(ctx, env);
            const request = new Request('http://deployer.do/api/cloudflare/namespaces', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const namespaces = await response.json();
            expect(Array.isArray(namespaces)).toBe(true);
        });
        it('should handle POST /api/cloudflare/namespaces', async () => {
            const instance = new DeployerDO(ctx, env);
            const request = new Request('http://deployer.do/api/cloudflare/namespaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'new-namespace' }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(201);
            const namespace = await response.json();
            expect(namespace.name).toBe('new-namespace');
        });
    });
});
