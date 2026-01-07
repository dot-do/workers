/**
 * RED Phase TDD: Source Maps in Production Tests
 *
 * These tests define the contract for source map support in production builds.
 * All tests should FAIL initially - implementation comes in GREEN phase (workers-1qqj.7).
 *
 * Key requirements:
 * - Source maps must be generated during build
 * - Source maps must be uploaded with deployments
 * - Stack traces must be mappable to original source
 * - Source maps must be secured (not publicly accessible)
 *
 * The Source Map Manager contract includes:
 * - createSourceMapManager() - Factory to create manager instance
 * - upload() - Upload source map for a deployment
 * - retrieve() - Retrieve source map (authenticated)
 * - mapStackTrace() - Map minified stack trace to source
 * - delete() - Delete source map for a deployment
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createSourceMapManager, type SourceMapManager } from '../src/source-maps.js'

describe('Source Map Manager - Production Source Maps', () => {
  describe('createSourceMapManager() factory', () => {
    it('should create a source map manager instance', () => {
      const manager = createSourceMapManager()
      expect(manager).toBeDefined()
      expect(typeof manager.upload).toBe('function')
      expect(typeof manager.retrieve).toBe('function')
      expect(typeof manager.mapStackTrace).toBe('function')
      expect(typeof manager.delete).toBe('function')
      expect(typeof manager.exists).toBe('function')
    })

    it('should accept storage configuration', () => {
      const manager = createSourceMapManager({
        storage: {
          type: 'kv',
          namespace: 'SOURCE_MAPS',
        },
      })
      expect(manager).toBeDefined()
    })

    it('should accept R2 storage configuration', () => {
      const manager = createSourceMapManager({
        storage: {
          type: 'r2',
          bucket: 'source-maps',
        },
      })
      expect(manager).toBeDefined()
    })
  })

  describe('upload() - Source Map Storage', () => {
    let manager: SourceMapManager

    beforeEach(() => {
      manager = createSourceMapManager()
    })

    it('should upload source map for a deployment', async () => {
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        names: ['greet'],
        mappings: 'AAAA,SAAS,KAAK',
      })

      const result = await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap,
      })

      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
    })

    it('should store source map with deployment metadata', async () => {
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        names: [],
        mappings: 'AAAA',
      })

      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap,
        metadata: {
          version: '1.0.0',
          commit: 'abc123',
          buildTime: Date.now(),
        },
      })

      const metadata = await manager.getMetadata('deploy-001')
      expect(metadata).toBeDefined()
      expect(metadata?.version).toBe('1.0.0')
      expect(metadata?.commit).toBe('abc123')
    })

    it('should validate source map format before upload', async () => {
      const invalidSourceMap = 'not a valid source map'

      const result = await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: invalidSourceMap,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid source map')
    })

    it('should reject source maps without required fields', async () => {
      const incompleteSourceMap = JSON.stringify({
        version: 3,
        // missing sources, names, mappings
      })

      const result = await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: incompleteSourceMap,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid source map')
    })

    it('should handle multiple source files in source map', async () => {
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['index.ts', 'utils.ts', 'helpers.ts'],
        names: ['foo', 'bar', 'baz'],
        mappings: 'AAAA,IACI,GAAG',
      })

      const result = await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap,
      })

      expect(result.success).toBe(true)
    })

    it('should overwrite existing source map for same deployment', async () => {
      const sourceMap1 = JSON.stringify({
        version: 3,
        sources: ['old.ts'],
        names: [],
        mappings: 'AAAA',
      })

      const sourceMap2 = JSON.stringify({
        version: 3,
        sources: ['new.ts'],
        names: [],
        mappings: 'BBBB',
      })

      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: sourceMap1,
      })

      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: sourceMap2,
      })

      const retrieved = await manager.retrieve('deploy-001', { token: 'valid-token' })
      expect(retrieved).toBeDefined()
      expect(JSON.parse(retrieved!).sources).toContain('new.ts')
    })
  })

  describe('retrieve() - Source Map Retrieval', () => {
    let manager: SourceMapManager

    beforeEach(async () => {
      manager = createSourceMapManager()
      // Pre-upload a source map for testing retrieval
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: ['hello'],
          mappings: 'AAAA,SAAS,KAAK',
        }),
      })
    })

    it('should retrieve source map with valid authentication', async () => {
      const sourceMap = await manager.retrieve('deploy-001', {
        token: 'valid-auth-token',
      })

      expect(sourceMap).toBeDefined()
      const parsed = JSON.parse(sourceMap!)
      expect(parsed.version).toBe(3)
      expect(parsed.sources).toContain('index.ts')
    })

    it('should reject retrieval without authentication', async () => {
      await expect(
        manager.retrieve('deploy-001', { token: '' })
      ).rejects.toThrow('Authentication required')
    })

    it('should reject retrieval with invalid token', async () => {
      await expect(
        manager.retrieve('deploy-001', { token: 'invalid-token' })
      ).rejects.toThrow('Invalid authentication')
    })

    it('should return null for non-existent deployment', async () => {
      const sourceMap = await manager.retrieve('non-existent', {
        token: 'valid-auth-token',
      })

      expect(sourceMap).toBeNull()
    })

    it('should support API key authentication', async () => {
      const sourceMap = await manager.retrieve('deploy-001', {
        apiKey: 'valid-api-key',
      })

      expect(sourceMap).toBeDefined()
    })
  })

  describe('mapStackTrace() - Stack Trace Mapping', () => {
    let manager: SourceMapManager

    beforeEach(async () => {
      manager = createSourceMapManager()
      // Upload a realistic source map
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          file: 'bundle.js',
          sources: ['src/index.ts', 'src/utils.ts'],
          sourcesContent: [
            'export function greet(name: string) {\n  return `Hello ${name}`;\n}',
            'export function validate(input: string) {\n  if (!input) throw new Error("Invalid input");\n  return true;\n}',
          ],
          names: ['greet', 'validate', 'name', 'input'],
          mappings: 'AAAA,SAASA,MAAMC,GACb,MAAO,SAASD,EAClB',
        }),
      })
    })

    it('should map minified stack trace to original source', async () => {
      const minifiedStack = `Error: Something went wrong
    at a (bundle.js:1:15)
    at b (bundle.js:1:42)
    at Object.fetch (bundle.js:1:100)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      expect(mapped).toBeDefined()
      expect(mapped.frames.length).toBeGreaterThan(0)
      expect(mapped.frames[0]?.source).toContain('.ts')
    })

    it('should preserve error message in mapped trace', async () => {
      const minifiedStack = `TypeError: Cannot read property 'foo' of undefined
    at a (bundle.js:1:15)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      expect(mapped.message).toBe("TypeError: Cannot read property 'foo' of undefined")
    })

    it('should map line and column numbers', async () => {
      const minifiedStack = `Error: Test error
    at a (bundle.js:1:15)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      expect(mapped.frames[0]).toMatchObject({
        line: expect.any(Number),
        column: expect.any(Number),
      })
      // Original source lines should be reasonable (not just 1 for everything)
      expect(mapped.frames[0]?.line).toBeGreaterThanOrEqual(1)
    })

    it('should include original function names when available', async () => {
      const minifiedStack = `Error: Test error
    at a (bundle.js:1:15)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      // Should have original function name, not minified 'a'
      expect(mapped.frames[0]?.functionName).toBeDefined()
    })

    it('should include source context when available', async () => {
      const minifiedStack = `Error: Test error
    at a (bundle.js:1:15)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
        includeContext: true,
        contextLines: 3,
      })

      expect(mapped.frames[0]?.context).toBeDefined()
      expect(mapped.frames[0]?.context?.before).toBeDefined()
      expect(mapped.frames[0]?.context?.line).toBeDefined()
      expect(mapped.frames[0]?.context?.after).toBeDefined()
    })

    it('should handle stack traces from multiple files', async () => {
      const minifiedStack = `Error: Multi-file error
    at a (bundle.js:1:15)
    at b (bundle.js:1:100)
    at c (bundle.js:1:200)`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      expect(mapped.frames.length).toBe(3)
    })

    it('should gracefully handle unmappable frames', async () => {
      const minifiedStack = `Error: With unmappable frame
    at <anonymous> (bundle.js:1:15)
    at native code`

      const mapped = await manager.mapStackTrace('deploy-001', minifiedStack, {
        token: 'valid-auth-token',
      })

      // Should not throw, should return what it can map
      expect(mapped).toBeDefined()
    })

    it('should require authentication for stack trace mapping', async () => {
      const minifiedStack = `Error: Test
    at a (bundle.js:1:15)`

      await expect(
        manager.mapStackTrace('deploy-001', minifiedStack, { token: '' })
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('exists() - Source Map Existence Check', () => {
    let manager: SourceMapManager

    beforeEach(async () => {
      manager = createSourceMapManager()
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })
    })

    it('should return true for existing source map', async () => {
      const exists = await manager.exists('deploy-001')
      expect(exists).toBe(true)
    })

    it('should return false for non-existent source map', async () => {
      const exists = await manager.exists('non-existent')
      expect(exists).toBe(false)
    })
  })

  describe('delete() - Source Map Deletion', () => {
    let manager: SourceMapManager

    beforeEach(async () => {
      manager = createSourceMapManager()
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })
    })

    it('should delete source map for deployment', async () => {
      const result = await manager.delete('deploy-001', {
        token: 'valid-auth-token',
      })

      expect(result.success).toBe(true)

      const exists = await manager.exists('deploy-001')
      expect(exists).toBe(false)
    })

    it('should require authentication for deletion', async () => {
      await expect(
        manager.delete('deploy-001', { token: '' })
      ).rejects.toThrow('Authentication required')
    })

    it('should succeed for non-existent source map', async () => {
      const result = await manager.delete('non-existent', {
        token: 'valid-auth-token',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Security - Source Map Access Control', () => {
    let manager: SourceMapManager

    beforeEach(async () => {
      manager = createSourceMapManager()
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })
    })

    it('should not expose source maps via public URL', async () => {
      // Source maps should never be accessible via public URL patterns
      const publicUrl = manager.getPublicUrl?.('deploy-001')
      expect(publicUrl).toBeUndefined()
    })

    it('should validate token scope for source map access', async () => {
      // Token with wrong scope should be rejected
      await expect(
        manager.retrieve('deploy-001', {
          token: 'token-without-sourcemap-scope',
        })
      ).rejects.toThrow(/scope|permission|unauthorized/i)
    })

    it('should log access attempts for audit', async () => {
      const auditLog: Array<{ action: string; deploymentId: string }> = []

      const auditableManager = createSourceMapManager({
        onAccess: (action, deploymentId) => {
          auditLog.push({ action, deploymentId })
        },
      })

      await auditableManager.upload({
        deploymentId: 'deploy-audit',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })

      await auditableManager.retrieve('deploy-audit', { token: 'valid-token' })

      expect(auditLog).toContainEqual({
        action: 'retrieve',
        deploymentId: 'deploy-audit',
      })
    })

    it('should support IP allowlisting for access', async () => {
      const restrictedManager = createSourceMapManager({
        security: {
          allowedIPs: ['10.0.0.1', '192.168.1.0/24'],
        },
      })

      // Access from non-allowed IP should fail
      await expect(
        restrictedManager.retrieve('deploy-001', {
          token: 'valid-token',
          clientIP: '8.8.8.8',
        })
      ).rejects.toThrow(/IP not allowed/i)
    })

    it('should expire source maps after configured retention period', async () => {
      const expiringManager = createSourceMapManager({
        retention: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          autoDelete: true,
        },
      })

      await expiringManager.upload({
        deploymentId: 'deploy-old',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['old.ts'],
          names: [],
          mappings: 'AAAA',
        }),
        uploadedAt: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
      })

      // Old source maps should be auto-deleted or inaccessible
      const exists = await expiringManager.exists('deploy-old')
      expect(exists).toBe(false)
    })
  })

  describe('Integration with Build Pipeline', () => {
    it('should integrate with ESBuild worker for source map generation', async () => {
      // This test verifies the integration between build and source map storage
      const { createESBuildWorker } = await import('../src/index.js')

      const worker = createESBuildWorker()
      await worker.initialize()

      const result = await worker.compile(
        `
        export function greet(name: string): string {
          return \`Hello \${name}\`;
        }
        `,
        { sourcemap: true }
      )

      expect(result.map).toBeDefined()

      // Source map should be valid for upload
      const manager = createSourceMapManager()
      const uploadResult = await manager.upload({
        deploymentId: 'deploy-from-build',
        workerName: 'my-worker',
        sourceMap: result.map!,
      })

      expect(uploadResult.success).toBe(true)

      worker.dispose()
    })

    it('should support source map with embedded sources', async () => {
      const sourceMapWithSources = JSON.stringify({
        version: 3,
        sources: ['index.ts'],
        sourcesContent: [
          'export function greet(name: string) {\n  return `Hello ${name}`;\n}',
        ],
        names: ['greet', 'name'],
        mappings: 'AAAA,SAASA,MAAMC,GACb,MAAO,SAASD,EAClB',
      })

      const manager = createSourceMapManager()
      const result = await manager.upload({
        deploymentId: 'deploy-with-sources',
        workerName: 'my-worker',
        sourceMap: sourceMapWithSources,
      })

      expect(result.success).toBe(true)

      // Should be able to show source context when mapping
      const minifiedStack = `Error: Test
    at a (bundle.js:1:15)`

      const mapped = await manager.mapStackTrace('deploy-with-sources', minifiedStack, {
        token: 'valid-token',
        includeContext: true,
      })

      expect(mapped.frames[0]?.context?.line).toBeDefined()
    })
  })

  describe('Cleanup and Maintenance', () => {
    let manager: SourceMapManager

    beforeEach(() => {
      manager = createSourceMapManager()
    })

    it('should list all source maps for a worker', async () => {
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })

      await manager.upload({
        deploymentId: 'deploy-002',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'BBBB',
        }),
      })

      const list = await manager.list('my-worker', { token: 'valid-token' })

      expect(list).toHaveLength(2)
      expect(list.map((m) => m.deploymentId)).toContain('deploy-001')
      expect(list.map((m) => m.deploymentId)).toContain('deploy-002')
    })

    it('should support bulk deletion', async () => {
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })

      await manager.upload({
        deploymentId: 'deploy-002',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'BBBB',
        }),
      })

      const result = await manager.deleteMany(['deploy-001', 'deploy-002'], {
        token: 'valid-token',
      })

      expect(result.success).toBe(true)
      expect(result.deleted).toBe(2)

      expect(await manager.exists('deploy-001')).toBe(false)
      expect(await manager.exists('deploy-002')).toBe(false)
    })

    it('should report storage usage', async () => {
      await manager.upload({
        deploymentId: 'deploy-001',
        workerName: 'my-worker',
        sourceMap: JSON.stringify({
          version: 3,
          sources: ['index.ts'],
          names: [],
          mappings: 'AAAA',
        }),
      })

      const usage = await manager.getStorageUsage('my-worker', { token: 'valid-token' })

      expect(usage.totalBytes).toBeGreaterThan(0)
      expect(usage.count).toBe(1)
    })
  })
})
