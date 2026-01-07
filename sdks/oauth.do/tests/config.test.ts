import { describe, it, expect, beforeEach } from 'vitest'
import { configure, getConfig } from '../src/config.js'

describe('config', () => {
	beforeEach(() => {
		// Reset environment
		delete process.env.OAUTH_API_URL
		delete process.env.OAUTH_CLIENT_ID
		delete process.env.OAUTH_AUTHKIT_DOMAIN

		// Reset config to defaults
		configure({
			apiUrl: 'https://apis.do',
			clientId: 'oauth.do',
			authKitDomain: 'login.oauth.do',
			fetch: globalThis.fetch,
		})
	})

	it('should have default configuration', () => {
		const config = getConfig()

		expect(config.apiUrl).toBe('https://apis.do')
		expect(config.clientId).toBe('oauth.do')
		expect(config.authKitDomain).toBe('login.oauth.do')
		expect(config.fetch).toBe(globalThis.fetch)
	})

	it('should allow custom configuration', () => {
		const customFetch = (() => {}) as any

		configure({
			apiUrl: 'https://custom.apis.do',
			clientId: 'custom-client',
			authKitDomain: 'custom.oauth.do',
			fetch: customFetch,
		})

		const config = getConfig()

		expect(config.apiUrl).toBe('https://custom.apis.do')
		expect(config.clientId).toBe('custom-client')
		expect(config.authKitDomain).toBe('custom.oauth.do')
		expect(config.fetch).toBe(customFetch)
	})

	it('should merge partial configuration', () => {
		// First set full config to reset state
		configure({
			apiUrl: 'https://apis.do',
			clientId: '',
			authKitDomain: 'login.oauth.do',
			fetch: globalThis.fetch,
		})

		// Then set partial config
		configure({ apiUrl: 'https://custom.apis.do' })

		const config = getConfig()

		expect(config.apiUrl).toBe('https://custom.apis.do')
		expect(config.authKitDomain).toBe('login.oauth.do')
	})
})
