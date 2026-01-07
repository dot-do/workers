/**
 * RED Phase TDD: NPM Worker Package Publishing Tests
 *
 * These tests define the contract for a Workers-compatible NPM publishing worker.
 * All tests should FAIL initially - implementation comes in GREEN phase (workers-1qqj.4).
 *
 * Key requirements:
 * - Must publish packages to npm registry via HTTP API
 * - Must handle authentication via Bearer tokens
 * - Must create proper package tarballs
 * - Must validate package metadata before publishing
 * - Must handle errors gracefully (version conflicts, auth failures, etc.)
 *
 * The NPM Worker contract includes:
 * - createNpmWorker() - Factory to create worker instance
 * - publish() - Publish a package to the registry
 * - validate() - Validate package metadata before publishing
 * - versionExists() - Check if a version already exists
 * - getPackageInfo() - Get package metadata from registry
 * - unpublish() - Remove a package version (use with caution)
 * - createTarball() - Create a package tarball from source files
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createNpmWorker, type NpmWorker, type PackageInfo } from '../src/index.js'

describe('NPM Worker - Package Publishing', () => {
  describe('createNpmWorker() factory', () => {
    it('should create an NPM worker instance', () => {
      const worker = createNpmWorker()
      expect(worker).toBeDefined()
      expect(typeof worker.publish).toBe('function')
      expect(typeof worker.validate).toBe('function')
      expect(typeof worker.versionExists).toBe('function')
      expect(typeof worker.getPackageInfo).toBe('function')
      expect(typeof worker.unpublish).toBe('function')
      expect(typeof worker.createTarball).toBe('function')
    })

    it('should work in Workers environment without Node.js APIs', () => {
      // The worker should not depend on Node.js specific modules
      // Must use fetch() for HTTP and native APIs for tarball creation
      const worker = createNpmWorker()
      expect(worker).toBeDefined()
    })
  })

  describe('publish() - Basic Package Publishing', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should publish a package successfully', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/test-package',
        version: '1.0.0',
        description: 'A test package',
        tarball: 'base64-encoded-tarball-content',
        token: 'npm_test_token_123',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
      expect(result.name).toBe('@dotdo/test-package')
      expect(result.version).toBe('1.0.0')
      expect(result.url).toContain('npmjs.com')
    })

    it('should return package URL in result', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/test-package',
        version: '1.0.0',
        tarball: 'base64-encoded-tarball-content',
        token: 'npm_test_token_123',
      }

      const result = await worker.publish(pkg)

      expect(result.url).toBeDefined()
      expect(result.url).toContain('@dotdo/test-package')
    })

    it('should support ArrayBuffer tarball', async () => {
      const encoder = new TextEncoder()
      const tarballBuffer = encoder.encode('fake-tarball-content').buffer as ArrayBuffer

      const pkg: PackageInfo = {
        name: '@dotdo/buffer-package',
        version: '1.0.0',
        tarball: tarballBuffer,
        token: 'npm_test_token_123',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support base64 string tarball', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/string-package',
        version: '1.0.0',
        tarball: btoa('fake-tarball-content'),
        token: 'npm_test_token_123',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })
  })

  describe('publish() - Authentication', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should use Bearer token authentication', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/auth-test',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_valid_token_abc123',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should fail with invalid token', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/auth-test',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'invalid_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.statusCode).toBe(401)
    })

    it('should fail without token', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/auth-test',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: '',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toContain('token')
    })

    it('should handle expired tokens', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/auth-test',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_expired_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(401)
    })
  })

  describe('publish() - Registry Configuration', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should use default npm registry when not specified', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/default-registry',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      // Default should be https://registry.npmjs.org
      expect(result.success).toBe(true)
    })

    it('should support custom registry URL', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/custom-registry',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        registry: 'https://npm.pkg.github.com',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support private npm registry', async () => {
      const pkg: PackageInfo = {
        name: '@company/private-package',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        registry: 'https://registry.company.com',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })
  })

  describe('publish() - Access Control', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should default to public access for scoped packages', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/public-package',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support restricted access', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/private-package',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        access: 'restricted',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support public access explicitly', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/explicit-public',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        access: 'public',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })
  })

  describe('publish() - Distribution Tags', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should use latest tag by default', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/tagged-package',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support custom distribution tag', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/tagged-package',
        version: '2.0.0-beta.1',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        tag: 'beta',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })

    it('should support next tag', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/tagged-package',
        version: '2.0.0-alpha.1',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        tag: 'next',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(true)
    })
  })

  describe('publish() - Error Handling', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should handle version conflict (already exists)', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/existing-package',
        version: '1.0.0', // Assume this version exists
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toContain('version')
      expect(result.statusCode).toBe(409)
    })

    it('should handle package name conflicts', async () => {
      const pkg: PackageInfo = {
        name: 'express', // Package owned by someone else
        version: '999.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.statusCode).toBe(403)
    })

    it('should handle network errors gracefully', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/network-test',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
        registry: 'https://invalid-registry.example.com',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle invalid package name', async () => {
      const pkg: PackageInfo = {
        name: 'INVALID_UPPERCASE_NAME',
        version: '1.0.0',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toContain('name')
    })

    it('should handle invalid version', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/invalid-version',
        version: 'not-a-semver',
        tarball: 'fake-tarball',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toContain('version')
    })

    it('should handle corrupted tarball', async () => {
      const pkg: PackageInfo = {
        name: '@dotdo/corrupted-tarball',
        version: '1.0.0',
        tarball: 'not-valid-base64-or-tarball!@#$%',
        token: 'npm_test_token',
      }

      const result = await worker.publish(pkg)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validate() - Package Validation', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should validate valid package', async () => {
      const pkg = {
        name: '@dotdo/valid-package',
        version: '1.0.0',
        description: 'A valid package',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid package name', async () => {
      const pkg = {
        name: 'INVALID-UPPERCASE',
        version: '1.0.0',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('name'))).toBe(true)
    })

    it('should reject empty package name', async () => {
      const pkg = {
        name: '',
        version: '1.0.0',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject invalid semver version', async () => {
      const pkg = {
        name: '@dotdo/invalid-version',
        version: '1.0',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('version'))).toBe(true)
    })

    it('should accept valid semver versions', async () => {
      const versions = ['1.0.0', '2.0.0-beta.1', '0.0.1-alpha', '10.20.30']

      for (const version of versions) {
        const pkg = {
          name: '@dotdo/semver-test',
          version,
          tarball: 'fake-tarball',
        }

        const result = await worker.validate(pkg)
        expect(result.valid).toBe(true)
      }
    })

    it('should warn about missing description', async () => {
      const pkg = {
        name: '@dotdo/no-description',
        version: '1.0.0',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(true) // Valid but with warning
      expect(result.warnings.some(e => e.toLowerCase().includes('description'))).toBe(true)
    })

    it('should reject names with special characters', async () => {
      const invalidNames = ['my package', 'my@package', 'my#package']

      for (const name of invalidNames) {
        const pkg = {
          name,
          version: '1.0.0',
          tarball: 'fake-tarball',
        }

        const result = await worker.validate(pkg)
        expect(result.valid).toBe(false)
      }
    })

    it('should validate scoped package names', async () => {
      const pkg = {
        name: '@dotdo/scoped-package',
        version: '1.0.0',
        tarball: 'fake-tarball',
      }

      const result = await worker.validate(pkg)

      expect(result.valid).toBe(true)
    })
  })

  describe('versionExists() - Version Checking', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should return true for existing version', async () => {
      const exists = await worker.versionExists('lodash', '4.17.21')

      expect(exists).toBe(true)
    })

    it('should return false for non-existing version', async () => {
      const exists = await worker.versionExists('lodash', '999.999.999')

      expect(exists).toBe(false)
    })

    it('should return false for non-existing package', async () => {
      const exists = await worker.versionExists('@dotdo/definitely-does-not-exist', '1.0.0')

      expect(exists).toBe(false)
    })

    it('should support custom registry', async () => {
      const exists = await worker.versionExists(
        '@company/private-package',
        '1.0.0',
        {
          token: 'npm_test_token',
          registry: 'https://npm.pkg.github.com',
        }
      )

      expect(typeof exists).toBe('boolean')
    })

    it('should handle authentication for private packages', async () => {
      const exists = await worker.versionExists(
        '@dotdo/private-package',
        '1.0.0',
        { token: 'npm_test_token' }
      )

      expect(typeof exists).toBe('boolean')
    })
  })

  describe('getPackageInfo() - Package Metadata', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should return metadata for existing package', async () => {
      const info = await worker.getPackageInfo('lodash')

      expect(info).not.toBeNull()
      expect(info!.name).toBe('lodash')
      expect(info!['dist-tags']).toBeDefined()
      expect(info!.versions).toBeDefined()
    })

    it('should return null for non-existing package', async () => {
      const info = await worker.getPackageInfo('@dotdo/definitely-does-not-exist')

      expect(info).toBeNull()
    })

    it('should include version information', async () => {
      const info = await worker.getPackageInfo('lodash')

      expect(info).not.toBeNull()
      expect(info!.versions).toBeDefined()
      expect(info!.versions!['4.17.21']).toBeDefined()
      expect(info!.versions!['4.17.21']?.dist).toBeDefined()
    })

    it('should include dist-tags', async () => {
      const info = await worker.getPackageInfo('lodash')

      expect(info).not.toBeNull()
      expect(info!['dist-tags']).toBeDefined()
      expect(info!['dist-tags']!.latest).toBeDefined()
    })

    it('should support authentication for private packages', async () => {
      const info = await worker.getPackageInfo(
        '@dotdo/private-package',
        { token: 'npm_test_token' }
      )

      // Should not throw, may return null if package doesn't exist
      expect(info === null || typeof info === 'object').toBe(true)
    })

    it('should support custom registry', async () => {
      const info = await worker.getPackageInfo(
        '@company/private-package',
        {
          token: 'npm_test_token',
          registry: 'https://npm.pkg.github.com',
        }
      )

      expect(info === null || typeof info === 'object').toBe(true)
    })
  })

  describe('unpublish() - Package Removal', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should unpublish a specific version', async () => {
      const result = await worker.unpublish(
        '@dotdo/test-package',
        '1.0.0',
        { token: 'npm_test_token' }
      )

      expect(result.success).toBe(true)
    })

    it('should fail without authentication', async () => {
      const result = await worker.unpublish(
        '@dotdo/test-package',
        '1.0.0',
        { token: '' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should fail for non-existing package', async () => {
      const result = await worker.unpublish(
        '@dotdo/non-existing-package',
        '1.0.0',
        { token: 'npm_test_token' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should fail for package owned by someone else', async () => {
      const result = await worker.unpublish(
        'lodash',
        '4.17.21',
        { token: 'npm_test_token' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should support custom registry', async () => {
      const result = await worker.unpublish(
        '@company/private-package',
        '1.0.0',
        {
          token: 'npm_test_token',
          registry: 'https://npm.pkg.github.com',
        }
      )

      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('createTarball() - Tarball Generation', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should create tarball from files', async () => {
      const files = {
        'index.js': 'export const hello = "world";',
        'utils.js': 'export const add = (a, b) => a + b;',
      }

      const packageJson = {
        name: '@dotdo/tarball-test',
        version: '1.0.0',
        main: 'index.js',
      }

      const tarball = await worker.createTarball(files, packageJson)

      expect(tarball).toBeDefined()
      expect(typeof tarball).toBe('string')
      // Should be base64 encoded
      expect(() => atob(tarball)).not.toThrow()
    })

    it('should include package.json in tarball', async () => {
      const files = {
        'index.js': 'export default {};',
      }

      const packageJson = {
        name: '@dotdo/pkg-json-test',
        version: '1.0.0',
        description: 'Test package',
      }

      const tarball = await worker.createTarball(files, packageJson)

      expect(tarball).toBeDefined()
      // The tarball should contain the package.json
    })

    it('should handle nested directories', async () => {
      const files = {
        'index.js': 'export * from "./lib/main.js";',
        'lib/main.js': 'export const main = () => {};',
        'lib/utils/helpers.js': 'export const helper = () => {};',
      }

      const packageJson = {
        name: '@dotdo/nested-test',
        version: '1.0.0',
      }

      const tarball = await worker.createTarball(files, packageJson)

      expect(tarball).toBeDefined()
    })

    it('should handle binary files', async () => {
      const files = {
        'index.js': 'export default {};',
        'assets/icon.png': '\x89PNG\r\n\x1a\n...', // Fake PNG header
      }

      const packageJson = {
        name: '@dotdo/binary-test',
        version: '1.0.0',
      }

      const tarball = await worker.createTarball(files, packageJson)

      expect(tarball).toBeDefined()
    })

    it('should handle TypeScript declaration files', async () => {
      const files = {
        'index.js': 'export const value = 42;',
        'index.d.ts': 'export declare const value: number;',
      }

      const packageJson = {
        name: '@dotdo/types-test',
        version: '1.0.0',
        types: 'index.d.ts',
      }

      const tarball = await worker.createTarball(files, packageJson)

      expect(tarball).toBeDefined()
    })

    it('should create deterministic tarballs', async () => {
      const files = {
        'index.js': 'export default {};',
      }

      const packageJson = {
        name: '@dotdo/deterministic-test',
        version: '1.0.0',
      }

      const tarball1 = await worker.createTarball(files, packageJson)
      const tarball2 = await worker.createTarball(files, packageJson)

      expect(tarball1).toBe(tarball2)
    })
  })

  describe('Workers Environment Compatibility', () => {
    it('should not require file system access', async () => {
      const worker = createNpmWorker()

      // Should work with in-memory data only
      const files = {
        'index.js': 'export default {};',
      }
      const packageJson = {
        name: '@dotdo/no-fs-test',
        version: '1.0.0',
      }

      const tarball = await worker.createTarball(files, packageJson)
      expect(tarball).toBeDefined()
    })

    it('should handle concurrent operations', async () => {
      const worker = createNpmWorker()

      const operations = [
        worker.versionExists('lodash', '4.17.21'),
        worker.versionExists('express', '4.18.0'),
        worker.getPackageInfo('lodash'),
        worker.validate({
          name: '@dotdo/concurrent-test',
          version: '1.0.0',
          tarball: 'fake',
        }),
      ]

      const results = await Promise.all(operations)

      expect(results).toHaveLength(4)
    })

    it('should handle large files efficiently', async () => {
      const worker = createNpmWorker()

      // Generate a large file
      const largeContent = 'x'.repeat(1024 * 1024) // 1MB

      const files = {
        'index.js': 'export default {};',
        'large-file.js': largeContent,
      }

      const packageJson = {
        name: '@dotdo/large-file-test',
        version: '1.0.0',
      }

      const start = Date.now()
      const tarball = await worker.createTarball(files, packageJson)
      const duration = Date.now() - start

      expect(tarball).toBeDefined()
      // Should complete in reasonable time (under 5 seconds)
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('Integration - Full Publish Flow', () => {
    let worker: NpmWorker

    beforeEach(() => {
      worker = createNpmWorker()
    })

    it('should validate, create tarball, and publish', async () => {
      // Step 1: Validate package metadata
      const validation = await worker.validate({
        name: '@dotdo/full-flow-test',
        version: '1.0.0',
        description: 'Integration test package',
        tarball: '',
      })
      expect(validation.valid).toBe(true)

      // Step 2: Check if version exists
      const exists = await worker.versionExists('@dotdo/full-flow-test', '1.0.0')
      expect(exists).toBe(false)

      // Step 3: Create tarball
      const files = {
        'index.js': 'export const hello = "world";',
      }
      const packageJson = {
        name: '@dotdo/full-flow-test',
        version: '1.0.0',
        description: 'Integration test package',
        main: 'index.js',
      }
      const tarball = await worker.createTarball(files, packageJson)
      expect(tarball).toBeDefined()

      // Step 4: Publish
      const result = await worker.publish({
        name: '@dotdo/full-flow-test',
        version: '1.0.0',
        description: 'Integration test package',
        tarball,
        token: 'npm_test_token',
      })
      expect(result.success).toBe(true)
    })

    it('should handle publish with custom settings', async () => {
      const files = {
        'index.js': 'export default {};',
        'index.d.ts': 'export default {};',
      }

      const packageJson = {
        name: '@dotdo/custom-settings-test',
        version: '1.0.0-beta.1',
        description: 'Beta release',
        main: 'index.js',
        types: 'index.d.ts',
      }

      const tarball = await worker.createTarball(files, packageJson)

      const result = await worker.publish({
        name: '@dotdo/custom-settings-test',
        version: '1.0.0-beta.1',
        description: 'Beta release',
        tarball,
        token: 'npm_test_token',
        access: 'public',
        tag: 'beta',
      })

      expect(result.success).toBe(true)
    })
  })
})
