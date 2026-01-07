/**
 * RED Tests: deployer.do Version Management
 *
 * These tests define the contract for the deployer worker's version management.
 * The DeployerDO must support creating, listing, and managing script versions.
 *
 * Per issue description:
 * - Version management functionality
 * - Track multiple versions per script
 * - Support version metadata
 *
 * RED PHASE: These tests MUST FAIL because DeployerDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hg7p).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv, createMockCloudflareAPI, } from './helpers.js';
/**
 * Attempt to load DeployerDO - this will fail in RED phase
 */
async function loadDeployerDO() {
    const module = await import('../src/deployer.js');
    return module.DeployerDO;
}
describe('DeployerDO Version Management', () => {
    let ctx;
    let env;
    let DeployerDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv({ cloudflareApi: createMockCloudflareAPI() });
        DeployerDO = await loadDeployerDO();
    });
    describe('createVersion() - Create new versions', () => {
        it('should create a new version for a script', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'versioned-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'versioned-worker',
                content: 'export default { fetch() { return new Response("v1") } }',
            });
            expect(version.id).toBeDefined();
            expect(version.scriptName).toBe('versioned-worker');
            expect(version.number).toBe(1);
            expect(version.size).toBeGreaterThan(0);
            expect(version.createdAt).toBeDefined();
        });
        it('should increment version number for subsequent versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'multi-version-worker',
                content: 'export default {}',
            });
            const v1 = await instance.createVersion({
                scriptName: 'multi-version-worker',
                content: 'version 1',
            });
            const v2 = await instance.createVersion({
                scriptName: 'multi-version-worker',
                content: 'version 2',
            });
            const v3 = await instance.createVersion({
                scriptName: 'multi-version-worker',
                content: 'version 3',
            });
            expect(v1.number).toBe(1);
            expect(v2.number).toBe(2);
            expect(v3.number).toBe(3);
        });
        it('should include metadata in version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'metadata-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'metadata-worker',
                content: 'export default {}',
                metadata: {
                    main_module: 'index.js',
                    compatibility_date: '2024-01-01',
                    compatibility_flags: ['nodejs_compat'],
                    tag: 'v1.0.0',
                    message: 'Initial release',
                },
            });
            expect(version.metadata.main_module).toBe('index.js');
            expect(version.metadata.compatibility_date).toBe('2024-01-01');
            expect(version.metadata.compatibility_flags).toContain('nodejs_compat');
            expect(version.metadata.tag).toBe('v1.0.0');
            expect(version.metadata.message).toBe('Initial release');
        });
        it('should fail for non-existent script', async () => {
            const instance = new DeployerDO(ctx, env);
            await expect(instance.createVersion({
                scriptName: 'non-existent-worker',
                content: 'export default {}',
            })).rejects.toThrow(/script.*not found|does not exist/i);
        });
        it('should handle ArrayBuffer content', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'binary-version-worker',
                content: 'export default {}',
            });
            const content = new TextEncoder().encode('export default {}');
            const version = await instance.createVersion({
                scriptName: 'binary-version-worker',
                content: content.buffer,
            });
            expect(version.size).toBeGreaterThan(0);
        });
    });
    describe('getVersion() - Retrieve specific version', () => {
        it('should return version by script name and version ID', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'get-version-worker',
                content: 'export default {}',
            });
            const created = await instance.createVersion({
                scriptName: 'get-version-worker',
                content: 'version content',
            });
            const retrieved = await instance.getVersion('get-version-worker', created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved.id).toBe(created.id);
            expect(retrieved.scriptName).toBe('get-version-worker');
        });
        it('should return null for non-existent version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'version-worker',
                content: 'export default {}',
            });
            const result = await instance.getVersion('version-worker', 'non-existent-version');
            expect(result).toBeNull();
        });
        it('should return null for non-existent script', async () => {
            const instance = new DeployerDO(ctx, env);
            const result = await instance.getVersion('non-existent', 'version-id');
            expect(result).toBeNull();
        });
    });
    describe('listVersions() - List all versions', () => {
        it('should list all versions for a script', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'list-versions-worker',
                content: 'export default {}',
            });
            await instance.createVersion({ scriptName: 'list-versions-worker', content: 'v1' });
            await instance.createVersion({ scriptName: 'list-versions-worker', content: 'v2' });
            await instance.createVersion({ scriptName: 'list-versions-worker', content: 'v3' });
            const versions = await instance.listVersions('list-versions-worker');
            expect(versions).toBeInstanceOf(Array);
            expect(versions.length).toBe(3);
            expect(versions.every(v => v.scriptName === 'list-versions-worker')).toBe(true);
        });
        it('should return empty array for script with no versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'no-versions-worker',
                content: 'export default {}',
            });
            const versions = await instance.listVersions('no-versions-worker');
            expect(versions).toEqual([]);
        });
        it('should respect limit option', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'limit-versions-worker',
                content: 'export default {}',
            });
            for (let i = 0; i < 10; i++) {
                await instance.createVersion({
                    scriptName: 'limit-versions-worker',
                    content: `version ${i}`,
                });
            }
            const versions = await instance.listVersions('limit-versions-worker', { limit: 5 });
            expect(versions.length).toBeLessThanOrEqual(5);
        });
        it('should support sorting by version number', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'sort-versions-worker',
                content: 'export default {}',
            });
            await instance.createVersion({ scriptName: 'sort-versions-worker', content: 'v1' });
            await instance.createVersion({ scriptName: 'sort-versions-worker', content: 'v2' });
            await instance.createVersion({ scriptName: 'sort-versions-worker', content: 'v3' });
            const descVersions = await instance.listVersions('sort-versions-worker', {
                sortBy: 'number',
                order: 'desc',
            });
            expect(descVersions[0].number).toBe(3);
            expect(descVersions[2].number).toBe(1);
            const ascVersions = await instance.listVersions('sort-versions-worker', {
                sortBy: 'number',
                order: 'asc',
            });
            expect(ascVersions[0].number).toBe(1);
            expect(ascVersions[2].number).toBe(3);
        });
        it('should return empty array for non-existent script', async () => {
            const instance = new DeployerDO(ctx, env);
            const versions = await instance.listVersions('non-existent-worker');
            expect(versions).toEqual([]);
        });
    });
    describe('getLatestVersion() - Get most recent version', () => {
        it('should return the most recently created version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'latest-version-worker',
                content: 'export default {}',
            });
            await instance.createVersion({
                scriptName: 'latest-version-worker',
                content: 'v1',
                metadata: { message: 'first' },
            });
            await instance.createVersion({
                scriptName: 'latest-version-worker',
                content: 'v2',
                metadata: { message: 'second' },
            });
            const v3 = await instance.createVersion({
                scriptName: 'latest-version-worker',
                content: 'v3',
                metadata: { message: 'third' },
            });
            const latest = await instance.getLatestVersion('latest-version-worker');
            expect(latest).not.toBeNull();
            expect(latest.id).toBe(v3.id);
            expect(latest.number).toBe(3);
            expect(latest.metadata.message).toBe('third');
        });
        it('should return null for script with no versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'empty-versions-worker',
                content: 'export default {}',
            });
            const latest = await instance.getLatestVersion('empty-versions-worker');
            expect(latest).toBeNull();
        });
        it('should return null for non-existent script', async () => {
            const instance = new DeployerDO(ctx, env);
            const latest = await instance.getLatestVersion('non-existent-worker');
            expect(latest).toBeNull();
        });
    });
    describe('getActiveVersion() - Get currently deployed version', () => {
        it('should return the version that is currently active', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'active-version-worker',
                content: 'export default {}',
            });
            const v1 = await instance.createVersion({
                scriptName: 'active-version-worker',
                content: 'v1',
            });
            // Need to import deploy from the main interface
            const fullInstance = instance;
            await fullInstance.deploy({
                scriptName: 'active-version-worker',
                versionId: v1.id,
            });
            const active = await instance.getActiveVersion('active-version-worker');
            expect(active).not.toBeNull();
            expect(active.id).toBe(v1.id);
            expect(active.isActive).toBe(true);
        });
        it('should return null for script with no active deployment', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'inactive-version-worker',
                content: 'export default {}',
            });
            await instance.createVersion({
                scriptName: 'inactive-version-worker',
                content: 'v1',
            });
            const active = await instance.getActiveVersion('inactive-version-worker');
            expect(active).toBeNull();
        });
        it('should return null for non-existent script', async () => {
            const instance = new DeployerDO(ctx, env);
            const active = await instance.getActiveVersion('non-existent-worker');
            expect(active).toBeNull();
        });
    });
    describe('compareVersions() - Diff between versions', () => {
        it('should compare two versions and return diff', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'compare-worker',
                content: 'export default {}',
            });
            const v1 = await instance.createVersion({
                scriptName: 'compare-worker',
                content: 'export default { fetch() { return new Response("v1") } }',
                metadata: { compatibility_date: '2024-01-01' },
            });
            const v2 = await instance.createVersion({
                scriptName: 'compare-worker',
                content: 'export default { fetch() { return new Response("v2") } }',
                metadata: { compatibility_date: '2024-06-01' },
            });
            const diff = await instance.compareVersions('compare-worker', v1.id, v2.id);
            expect(diff.versionA.id).toBe(v1.id);
            expect(diff.versionB.id).toBe(v2.id);
            expect(diff.changes.contentChanged).toBe(true);
            expect(diff.changes.compatibilityChanged).toBe(true);
            expect(diff.changes.lines.added).toBeGreaterThanOrEqual(0);
            expect(diff.changes.lines.removed).toBeGreaterThanOrEqual(0);
        });
        it('should report no changes for identical versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'identical-worker',
                content: 'export default {}',
            });
            const content = 'export default { fetch() { return new Response("same") } }';
            const v1 = await instance.createVersion({
                scriptName: 'identical-worker',
                content,
            });
            const v2 = await instance.createVersion({
                scriptName: 'identical-worker',
                content,
            });
            const diff = await instance.compareVersions('identical-worker', v1.id, v2.id);
            expect(diff.changes.contentChanged).toBe(false);
            expect(diff.changes.lines.added).toBe(0);
            expect(diff.changes.lines.removed).toBe(0);
        });
        it('should throw for non-existent version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'missing-version-worker',
                content: 'export default {}',
            });
            const v1 = await instance.createVersion({
                scriptName: 'missing-version-worker',
                content: 'v1',
            });
            await expect(instance.compareVersions('missing-version-worker', v1.id, 'non-existent')).rejects.toThrow(/version.*not found/i);
        });
    });
    describe('deleteVersion() - Remove a version', () => {
        it('should delete a specific version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'delete-version-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'delete-version-worker',
                content: 'to be deleted',
            });
            const result = await instance.deleteVersion('delete-version-worker', version.id);
            expect(result).toBe(true);
            const deleted = await instance.getVersion('delete-version-worker', version.id);
            expect(deleted).toBeNull();
        });
        it('should return false for non-existent version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'no-delete-worker',
                content: 'export default {}',
            });
            const result = await instance.deleteVersion('no-delete-worker', 'non-existent');
            expect(result).toBe(false);
        });
        it('should not allow deleting active version', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'active-delete-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'active-delete-worker',
                content: 'active version',
            });
            const fullInstance = instance;
            await fullInstance.deploy({
                scriptName: 'active-delete-worker',
                versionId: version.id,
            });
            await expect(instance.deleteVersion('active-delete-worker', version.id)).rejects.toThrow(/cannot delete.*active|currently deployed/i);
        });
    });
    describe('HTTP endpoints for versions', () => {
        it('should handle GET /api/scripts/:name/versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'http-versions-worker',
                content: 'export default {}',
            });
            await instance.createVersion({ scriptName: 'http-versions-worker', content: 'v1' });
            const request = new Request('http://deployer.do/api/scripts/http-versions-worker/versions', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const versions = await response.json();
            expect(Array.isArray(versions)).toBe(true);
        });
        it('should handle POST /api/scripts/:name/versions', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'post-version-worker',
                content: 'export default {}',
            });
            const request = new Request('http://deployer.do/api/scripts/post-version-worker/versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: 'export default { fetch() { return new Response("new") } }',
                    metadata: { tag: 'v1.0.0' },
                }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(201);
            const version = await response.json();
            expect(version.scriptName).toBe('post-version-worker');
            expect(version.metadata.tag).toBe('v1.0.0');
        });
        it('should handle GET /api/scripts/:name/versions/:versionId', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'get-single-version-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'get-single-version-worker',
                content: 'specific version',
            });
            const request = new Request(`http://deployer.do/api/scripts/get-single-version-worker/versions/${version.id}`, { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const retrieved = await response.json();
            expect(retrieved.id).toBe(version.id);
        });
        it('should handle GET /api/scripts/:name/versions/latest', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'latest-http-worker',
                content: 'export default {}',
            });
            await instance.createVersion({ scriptName: 'latest-http-worker', content: 'v1' });
            const v2 = await instance.createVersion({ scriptName: 'latest-http-worker', content: 'v2' });
            const request = new Request('http://deployer.do/api/scripts/latest-http-worker/versions/latest', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const latest = await response.json();
            expect(latest.id).toBe(v2.id);
        });
        it('should handle DELETE /api/scripts/:name/versions/:versionId', async () => {
            const instance = new DeployerDO(ctx, env);
            await instance.uploadScript({
                scriptName: 'delete-http-version-worker',
                content: 'export default {}',
            });
            const version = await instance.createVersion({
                scriptName: 'delete-http-version-worker',
                content: 'to delete',
            });
            const request = new Request(`http://deployer.do/api/scripts/delete-http-version-worker/versions/${version.id}`, { method: 'DELETE' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
        });
    });
});
