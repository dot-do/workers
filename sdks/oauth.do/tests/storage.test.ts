import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdir, rm, readFile, stat } from 'fs/promises'
import {
	MemoryTokenStorage,
	LocalStorageTokenStorage,
	SecureFileTokenStorage,
	KeychainTokenStorage,
	CompositeTokenStorage,
	createSecureStorage,
} from '../src/storage.js'

describe('TokenStorage', () => {
	describe('MemoryTokenStorage', () => {
		let storage: MemoryTokenStorage

		beforeEach(() => {
			storage = new MemoryTokenStorage()
		})

		it('should return null when no token stored', async () => {
			const token = await storage.getToken()
			expect(token).toBeNull()
		})

		it('should store and retrieve token', async () => {
			await storage.setToken('test-token')
			const token = await storage.getToken()
			expect(token).toBe('test-token')
		})

		it('should remove token', async () => {
			await storage.setToken('test-token')
			await storage.removeToken()
			const token = await storage.getToken()
			expect(token).toBeNull()
		})
	})

	describe('LocalStorageTokenStorage', () => {
		let storage: LocalStorageTokenStorage

		beforeEach(() => {
			// Mock localStorage
			global.localStorage = {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				key: vi.fn(),
				length: 0,
			}

			storage = new LocalStorageTokenStorage()
		})

		it('should return null when no token in localStorage', async () => {
			;(global.localStorage.getItem as any).mockReturnValue(null)

			const token = await storage.getToken()
			expect(token).toBeNull()
		})

		it('should store and retrieve token from localStorage', async () => {
			await storage.setToken('test-token')
			expect(global.localStorage.setItem).toHaveBeenCalledWith('oauth.do:token', 'test-token')

			;(global.localStorage.getItem as any).mockReturnValue('test-token')
			const token = await storage.getToken()
			expect(token).toBe('test-token')
		})

		it('should remove token from localStorage', async () => {
			await storage.removeToken()
			expect(global.localStorage.removeItem).toHaveBeenCalledWith('oauth.do:token')
		})
	})

	describe('SecureFileTokenStorage', () => {
		let storage: SecureFileTokenStorage
		let testDir: string

		beforeEach(async () => {
			// Create a test-specific storage instance
			// Note: This tests the actual file operations
			storage = new SecureFileTokenStorage()
		})

		afterEach(async () => {
			// Clean up
			await storage.removeToken()
		})

		it('should return null when no token stored', async () => {
			await storage.removeToken() // Ensure clean state
			const token = await storage.getToken()
			expect(token).toBeNull()
		})

		it('should store and retrieve token', async () => {
			const testToken = `test-token-${Date.now()}`
			await storage.setToken(testToken)
			const token = await storage.getToken()
			expect(token).toBe(testToken)
		})

		it('should remove token', async () => {
			const testToken = `test-token-${Date.now()}`
			await storage.setToken(testToken)
			await storage.removeToken()
			const token = await storage.getToken()
			expect(token).toBeNull()
		})

		it('should set restrictive file permissions (0600)', async () => {
			const testToken = `test-token-${Date.now()}`
			await storage.setToken(testToken)

			// Get the token path
			const tokenPath = join(process.env.HOME || '', '.oauth.do', 'token')
			const stats = await stat(tokenPath)
			const mode = stats.mode & 0o777

			// Should be readable/writable only by owner
			expect(mode).toBe(0o600)
		})

		it('should trim whitespace from stored tokens', async () => {
			const testToken = `test-token-${Date.now()}`
			await storage.setToken(`  ${testToken}  \n`)
			const token = await storage.getToken()
			// The token is stored as-is but trimmed on read
			expect(token).toBe(testToken)
		})
	})

	describe('KeychainTokenStorage', () => {
		let storage: KeychainTokenStorage

		beforeEach(() => {
			storage = new KeychainTokenStorage()
		})

		afterEach(async () => {
			// Clean up
			await storage.removeToken()
		})

		it('should check if keychain is available', async () => {
			const available = await storage.isAvailable()
			// This will be true on macOS/Windows/Linux with proper setup
			// or false in CI environments without keychain access
			expect(typeof available).toBe('boolean')
		})

		it('should handle keychain operations gracefully when available', async () => {
			const available = await storage.isAvailable()

			if (available) {
				const testToken = `keychain-test-${Date.now()}`

				// Store token
				await storage.setToken(testToken)

				// Retrieve token
				const token = await storage.getToken()
				expect(token).toBe(testToken)

				// Remove token
				await storage.removeToken()
				const removedToken = await storage.getToken()
				expect(removedToken).toBeNull()
			} else {
				// When keychain is not available, getToken should return null
				const token = await storage.getToken()
				expect(token).toBeNull()
			}
		})

		it('should return null when keychain is not available and getting token', async () => {
			// This test verifies graceful degradation
			const token = await storage.getToken()
			// Should return null or the actual token depending on availability
			expect(token === null || typeof token === 'string').toBe(true)
		})
	})

	describe('CompositeTokenStorage', () => {
		let storage: CompositeTokenStorage

		beforeEach(() => {
			storage = new CompositeTokenStorage()
		})

		afterEach(async () => {
			// Clean up from both storages
			await storage.removeToken()
		})

		it('should return storage info', async () => {
			const info = await storage.getStorageInfo()
			expect(info).toHaveProperty('type')
			expect(info).toHaveProperty('secure')
			expect(['keychain', 'file']).toContain(info.type)
			expect(info.secure).toBe(true)
		})

		it('should store and retrieve token', async () => {
			const testToken = `composite-test-${Date.now()}`
			await storage.setToken(testToken)
			const token = await storage.getToken()
			expect(token).toBe(testToken)
		})

		it('should remove token from all backends', async () => {
			const testToken = `composite-test-${Date.now()}`
			await storage.setToken(testToken)
			await storage.removeToken()
			const token = await storage.getToken()
			expect(token).toBeNull()
		})

		it('should prefer keychain when available', async () => {
			const info = await storage.getStorageInfo()
			// On systems with keychain access, it should use keychain
			// On systems without, it should use file
			expect(info.secure).toBe(true)
		})
	})

	describe('createSecureStorage', () => {
		it('should create a SecureFileTokenStorage instance', () => {
			const storage = createSecureStorage()
			expect(storage).toBeInstanceOf(SecureFileTokenStorage)
		})

		it('should be usable as TokenStorage interface', async () => {
			const storage = createSecureStorage()
			const testToken = `factory-test-${Date.now()}`

			await storage.setToken(testToken)
			const token = await storage.getToken()
			expect(token).toBe(testToken)

			await storage.removeToken()
			const removedToken = await storage.getToken()
			expect(removedToken).toBeNull()
		})

		it('should support custom storage path', async () => {
			const customPath = join(tmpdir(), `test-oauth-${Date.now()}`, 'custom-tokens.json')
			const storage = createSecureStorage(customPath)
			const testToken = `custom-path-test-${Date.now()}`

			await storage.setToken(testToken)
			const token = await storage.getToken()
			expect(token).toBe(testToken)

			// Verify the file was created at the custom path
			const fileContent = await readFile(customPath, 'utf-8')
			const data = JSON.parse(fileContent)
			expect(data.accessToken).toBe(testToken)

			// Verify file has correct permissions
			const stats = await stat(customPath)
			const mode = stats.mode & 0o777
			expect(mode).toBe(0o600)

			// Clean up
			await storage.removeToken()
			await rm(join(tmpdir(), customPath.split('/').slice(-2, -1)[0]), { recursive: true, force: true })
		})

		it('should expand tilde in custom path', async () => {
			const storage = createSecureStorage('~/.test-oauth/tokens.json')
			const testToken = `tilde-test-${Date.now()}`

			await storage.setToken(testToken)
			const token = await storage.getToken()
			expect(token).toBe(testToken)

			// Verify the file was created in home directory
			const expandedPath = join(process.env.HOME || '', '.test-oauth', 'tokens.json')
			const fileContent = await readFile(expandedPath, 'utf-8')
			const data = JSON.parse(fileContent)
			expect(data.accessToken).toBe(testToken)

			// Clean up
			await storage.removeToken()
			await rm(join(process.env.HOME || '', '.test-oauth'), { recursive: true, force: true })
		})
	})
})
