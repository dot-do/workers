/**
 * RED Tests: router worker Route Matching
 *
 * These tests define the contract for the router worker's path-based route matching.
 * The RouterDO must match request paths to route configurations.
 *
 * Per ARCHITECTURE.md:
 * - Pattern-based route matching
 * - Priority-based route selection
 * - Method-specific routing
 *
 * RED PHASE: These tests MUST FAIL because RouterDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hq66).
 *
 * @see ARCHITECTURE.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv, } from './helpers.js';
/**
 * Attempt to load RouterDO - this will fail in RED phase
 */
async function loadRouterDO() {
    const module = await import('../src/router.js');
    return module.RouterDO;
}
describe('RouterDO Route Matching', () => {
    let ctx;
    let env;
    let RouterDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        RouterDO = await loadRouterDO();
    });
    describe('addRoute()', () => {
        it('should add a route to a registered hostname', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [],
            });
            const route = {
                pattern: '/users/*',
                target: 'users-service',
            };
            await expect(instance.addRoute('api.example.com', route)).resolves.not.toThrow();
            const routes = await instance.listRoutes('api.example.com');
            expect(routes).toHaveLength(1);
            expect(routes[0]?.pattern).toBe('/users/*');
        });
        it('should throw for non-existent hostname', async () => {
            const instance = new RouterDO(ctx, env);
            const route = {
                pattern: '/api/*',
                target: 'api-service',
            };
            await expect(instance.addRoute('unknown.example.com', route)).rejects.toThrow(/hostname.*not found/i);
        });
        it('should validate route pattern format', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [],
            });
            const invalidRoute = {
                pattern: '', // Empty pattern is invalid
                target: 'service',
            };
            await expect(instance.addRoute('api.example.com', invalidRoute)).rejects.toThrow(/invalid.*pattern/i);
        });
        it('should require target for non-rewrite routes', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [],
            });
            const route = {
                pattern: '/api/*',
                target: '', // Empty target
            };
            await expect(instance.addRoute('api.example.com', route)).rejects.toThrow(/target.*required/i);
        });
    });
    describe('removeRoute()', () => {
        it('should remove existing route and return true', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [{ pattern: '/users/*', target: 'users-service' }],
            });
            const result = await instance.removeRoute('api.example.com', '/users/*');
            expect(result).toBe(true);
            const routes = await instance.listRoutes('api.example.com');
            expect(routes).toHaveLength(0);
        });
        it('should return false for non-existent route', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [],
            });
            const result = await instance.removeRoute('api.example.com', '/nonexistent/*');
            expect(result).toBe(false);
        });
    });
    describe('listRoutes()', () => {
        it('should return empty array for hostname with no routes', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [],
            });
            const routes = await instance.listRoutes('api.example.com');
            expect(routes).toEqual([]);
        });
        it('should return all routes for hostname', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.example.com',
                routes: [
                    { pattern: '/users/*', target: 'users-service' },
                    { pattern: '/orders/*', target: 'orders-service' },
                    { pattern: '/products/*', target: 'products-service' },
                ],
            });
            const routes = await instance.listRoutes('api.example.com');
            expect(routes).toHaveLength(3);
        });
        it('should throw for non-existent hostname', async () => {
            const instance = new RouterDO(ctx, env);
            await expect(instance.listRoutes('unknown.example.com')).rejects.toThrow(/hostname.*not found/i);
        });
    });
    describe('matchRoute() - Pattern Matching', () => {
        describe('Exact path matching', () => {
            it('should match exact path', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/health', target: 'health-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/health');
                expect(route).not.toBeNull();
                expect(route?.target).toBe('health-service');
            });
            it('should not match different path', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/health', target: 'health-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/status');
                expect(route).toBeNull();
            });
        });
        describe('Wildcard path matching', () => {
            it('should match single segment wildcard', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/users/:id', target: 'users-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/users/123');
                expect(route).not.toBeNull();
                expect(route?.target).toBe('users-service');
            });
            it('should match catch-all wildcard', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/files/*', target: 'files-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/files/path/to/file.txt');
                expect(route).not.toBeNull();
                expect(route?.target).toBe('files-service');
            });
            it('should match root catch-all', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/*', target: 'catch-all-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/any/path/here');
                expect(route).not.toBeNull();
                expect(route?.target).toBe('catch-all-service');
            });
            it('should match nested route parameters', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/users/:userId/posts/:postId', target: 'user-posts-service' }],
                });
                const route = await instance.matchRoute('api.example.com', '/users/42/posts/99');
                expect(route).not.toBeNull();
                expect(route?.target).toBe('user-posts-service');
            });
        });
        describe('Priority-based matching', () => {
            it('should prefer higher priority routes', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [
                        { pattern: '/api/*', target: 'generic-api', priority: 1 },
                        { pattern: '/api/v2/*', target: 'v2-api', priority: 10 },
                    ],
                });
                const route = await instance.matchRoute('api.example.com', '/api/v2/users');
                expect(route?.target).toBe('v2-api');
            });
            it('should prefer more specific routes at same priority', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [
                        { pattern: '/*', target: 'catch-all' },
                        { pattern: '/api/*', target: 'api-service' },
                        { pattern: '/api/users/*', target: 'users-service' },
                    ],
                });
                const route = await instance.matchRoute('api.example.com', '/api/users/123');
                expect(route?.target).toBe('users-service');
            });
            it('should prefer exact match over wildcard', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [
                        { pattern: '/health', target: 'exact-health' },
                        { pattern: '/*', target: 'catch-all' },
                    ],
                });
                const route = await instance.matchRoute('api.example.com', '/health');
                expect(route?.target).toBe('exact-health');
            });
        });
        describe('Method-specific matching', () => {
            it('should match route with specific method', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [
                        { pattern: '/users', target: 'users-list', methods: ['GET'] },
                        { pattern: '/users', target: 'users-create', methods: ['POST'] },
                    ],
                });
                const getRoute = await instance.matchRoute('api.example.com', '/users', 'GET');
                expect(getRoute?.target).toBe('users-list');
                const postRoute = await instance.matchRoute('api.example.com', '/users', 'POST');
                expect(postRoute?.target).toBe('users-create');
            });
            it('should match route with multiple methods', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/users/:id', target: 'users-crud', methods: ['GET', 'PUT', 'DELETE'] }],
                });
                const getRoute = await instance.matchRoute('api.example.com', '/users/123', 'GET');
                expect(getRoute?.target).toBe('users-crud');
                const putRoute = await instance.matchRoute('api.example.com', '/users/123', 'PUT');
                expect(putRoute?.target).toBe('users-crud');
            });
            it('should not match route with wrong method', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/users', target: 'users-get', methods: ['GET'] }],
                });
                const route = await instance.matchRoute('api.example.com', '/users', 'POST');
                expect(route).toBeNull();
            });
            it('should match route without method restriction', async () => {
                const instance = new RouterDO(ctx, env);
                await instance.registerHostname({
                    hostname: 'api.example.com',
                    routes: [{ pattern: '/open/*', target: 'open-service' }], // No methods specified
                });
                const getRoute = await instance.matchRoute('api.example.com', '/open/path', 'GET');
                expect(getRoute).not.toBeNull();
                const postRoute = await instance.matchRoute('api.example.com', '/open/path', 'POST');
                expect(postRoute).not.toBeNull();
            });
        });
    });
    describe('HTTP fetch() route matching', () => {
        it('should match route and forward request', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.workers.do',
                routes: [{ pattern: '/users/*', target: 'users-service' }],
            });
            const request = new Request('https://api.workers.do/users/123', {
                method: 'GET',
                headers: { Host: 'api.workers.do' },
            });
            const response = await instance.fetch(request);
            // Should route successfully
            expect([200, 307, 308]).toContain(response.status);
        });
        it('should respect method-specific routes via HTTP', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.workers.do',
                routes: [
                    { pattern: '/users', target: 'users-list', methods: ['GET'] },
                    { pattern: '/users', target: 'users-create', methods: ['POST'] },
                ],
            });
            const getRequest = new Request('https://api.workers.do/users', {
                method: 'GET',
                headers: { Host: 'api.workers.do' },
            });
            const getResponse = await instance.fetch(getRequest);
            expect([200, 307, 308]).toContain(getResponse.status);
            const postRequest = new Request('https://api.workers.do/users', {
                method: 'POST',
                headers: { Host: 'api.workers.do' },
            });
            const postResponse = await instance.fetch(postRequest);
            expect([200, 307, 308]).toContain(postResponse.status);
        });
        it('should return 405 for method not allowed', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.workers.do',
                routes: [{ pattern: '/readonly', target: 'read-service', methods: ['GET'] }],
            });
            const request = new Request('https://api.workers.do/readonly', {
                method: 'DELETE',
                headers: { Host: 'api.workers.do' },
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(405);
        });
        it('should use default target when no route matches', async () => {
            const instance = new RouterDO(ctx, env);
            await instance.registerHostname({
                hostname: 'api.workers.do',
                routes: [{ pattern: '/specific', target: 'specific-service' }],
                defaultTarget: 'fallback-service',
            });
            const request = new Request('https://api.workers.do/unmatched/path', {
                method: 'GET',
                headers: { Host: 'api.workers.do' },
            });
            const response = await instance.fetch(request);
            // Should route to default target
            expect([200, 307, 308]).toContain(response.status);
        });
    });
});
