#!/usr/bin/env node
/**
 * OAuth.do CLI
 * Authenticate with .do Platform using OAuth device flow
 *
 * Usage:
 *   oauth.do login     - Login using device authorization flow
 *   oauth.do logout    - Logout and remove stored credentials
 *   oauth.do whoami    - Show current authenticated user
 *   oauth.do token     - Display current authentication token
 */

import { authorizeDevice, pollForTokens } from './device.js'
import { auth, logout as logoutFn } from './auth.js'
import { createSecureStorage, SecureFileTokenStorage } from './storage.js'
import { configure } from './config.js'

// Color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
	blue: '\x1b[34m',
}

// Token storage - uses OS keychain when available, falls back to secure file storage
const storage = createSecureStorage()

/**
 * Configure OAuth from environment variables
 */
function configureFromEnv() {
	configure({
		apiUrl: process.env.OAUTH_API_URL || process.env.API_URL || 'https://apis.do',
		clientId: process.env.OAUTH_CLIENT_ID || 'client_01JQYTRXK9ZPD8JPJTKDCRB656',
		authKitDomain: process.env.OAUTH_AUTHKIT_DOMAIN || 'login.oauth.do',
	})
}

/**
 * Print error message
 */
function printError(message: string, error?: Error) {
	console.error(`${colors.red}Error:${colors.reset} ${message}`)
	if (error && error.message) {
		console.error(error.message)
	}
	if (error && error.stack && process.env.DEBUG) {
		console.error(`\n${colors.dim}Stack trace:${colors.reset}`)
		console.error(`${colors.dim}${error.stack}${colors.reset}`)
	}
}

/**
 * Print success message
 */
function printSuccess(message: string) {
	console.log(`${colors.green}✓${colors.reset} ${message}`)
}

/**
 * Print info message
 */
function printInfo(message: string) {
	console.log(`${colors.cyan}ℹ${colors.reset} ${message}`)
}

/**
 * Print help message
 */
function printHelp() {
	console.log(`
${colors.bright}OAuth.do CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  oauth.do <command> [options]

${colors.cyan}Commands:${colors.reset}
  login      Login using device authorization flow
  logout     Logout and remove stored credentials
  whoami     Show current authenticated user
  token      Display current authentication token
  status     Show authentication and storage status

${colors.cyan}Options:${colors.reset}
  --help, -h     Show this help message
  --version, -v  Show version
  --debug        Show debug information

${colors.cyan}Examples:${colors.reset}
  ${colors.gray}# Login to your account${colors.reset}
  oauth.do login

  ${colors.gray}# Check who is logged in${colors.reset}
  oauth.do whoami

  ${colors.gray}# Get your authentication token${colors.reset}
  oauth.do token

  ${colors.gray}# Logout${colors.reset}
  oauth.do logout

${colors.cyan}Environment Variables:${colors.reset}
  OAUTH_CLIENT_ID        Client ID for OAuth
  OAUTH_AUTHKIT_DOMAIN   AuthKit domain (default: login.oauth.do)
  OAUTH_API_URL          API base URL (default: https://apis.do)
  DEBUG                  Enable debug output
`)
}

/**
 * Print version
 */
function printVersion() {
	try {
		// Dynamic import of package.json
		import('../package.json', { assert: { type: 'json' } }).then((pkg) => {
			console.log(`oauth.do v${pkg.default.version}`)
		})
	} catch {
		console.log('oauth.do')
	}
}

/**
 * Login command - device authorization flow
 */
async function loginCommand() {
	try {
		console.log(`${colors.bright}Starting OAuth login...${colors.reset}\n`)

		// Step 1: Authorize device
		printInfo('Requesting device authorization...')
		const authResponse = await authorizeDevice()

		// Step 2: Display instructions to user
		console.log(`\n${colors.bright}To complete login:${colors.reset}`)
		console.log(`\n  1. Visit: ${colors.cyan}${authResponse.verification_uri}${colors.reset}`)
		console.log(`  2. Enter code: ${colors.bright}${colors.yellow}${authResponse.user_code}${colors.reset}`)
		console.log(`\n  ${colors.dim}Or open this URL directly:${colors.reset}`)
		console.log(`  ${colors.blue}${authResponse.verification_uri_complete}${colors.reset}\n`)

		// Auto-open browser (no prompt - better for automation/agents)
		const open = await import('open').catch(() => null)
		if (open) {
			try {
				await open.default(authResponse.verification_uri_complete)
				printSuccess('Opened browser for authentication')
			} catch {
				printInfo(`Could not open browser. Please visit the URL above manually.`)
			}
		} else {
			printInfo(`Could not open browser. Please visit the URL above manually.`)
		}

		// Step 3: Poll for tokens
		console.log(`\n${colors.dim}Waiting for authorization...${colors.reset}\n`)
		const tokenResponse = await pollForTokens(
			authResponse.device_code,
			authResponse.interval,
			authResponse.expires_in
		)

		// Step 4: Save token
		await storage.setToken(tokenResponse.access_token)

		// Step 5: Get user info
		const authResult = await auth(tokenResponse.access_token)

		printSuccess('Login successful!')
		if (authResult.user) {
			console.log(`\n${colors.dim}Logged in as:${colors.reset}`)
			if (authResult.user.name) {
				console.log(`  ${colors.bright}${authResult.user.name}${colors.reset}`)
			}
			if (authResult.user.email) {
				console.log(`  ${colors.gray}${authResult.user.email}${colors.reset}`)
			}
		}

		// Show storage info
		const fileStorage = storage as SecureFileTokenStorage
		if (typeof fileStorage.getStorageInfo === 'function') {
			const storageInfo = await fileStorage.getStorageInfo()
			console.log(`\n${colors.dim}Token stored in: ${colors.green}~/.oauth.do/token${colors.reset}${colors.reset}`)
		}
	} catch (error) {
		printError('Login failed', error instanceof Error ? error : undefined)
		process.exit(1)
	}
}

/**
 * Logout command
 */
async function logoutCommand() {
	try {
		// Get current token
		const token = await storage.getToken()

		if (!token) {
			printInfo('Not logged in')
			return
		}

		// Call logout endpoint
		await logoutFn(token)

		// Remove stored token
		await storage.removeToken()

		printSuccess('Logged out successfully')
	} catch (error) {
		printError('Logout failed', error instanceof Error ? error : undefined)
		process.exit(1)
	}
}

/**
 * Whoami command - show current user
 */
async function whoamiCommand() {
	try {
		const token = await storage.getToken()

		if (!token) {
			console.log(`${colors.dim}Not logged in${colors.reset}`)
			console.log(`\nRun ${colors.cyan}oauth.do login${colors.reset} to authenticate`)
			return
		}

		const authResult = await auth(token)

		if (!authResult.user) {
			console.log(`${colors.dim}Not authenticated${colors.reset}`)
			console.log(`\nRun ${colors.cyan}oauth.do login${colors.reset} to authenticate`)
			return
		}

		console.log(`${colors.bright}Authenticated as:${colors.reset}`)
		if (authResult.user.name) {
			console.log(`  ${colors.green}Name:${colors.reset} ${authResult.user.name}`)
		}
		if (authResult.user.email) {
			console.log(`  ${colors.green}Email:${colors.reset} ${authResult.user.email}`)
		}
		if (authResult.user.id) {
			console.log(`  ${colors.green}ID:${colors.reset} ${authResult.user.id}`)
		}
	} catch (error) {
		printError('Failed to get user info', error instanceof Error ? error : undefined)
		process.exit(1)
	}
}

/**
 * Token command - display current token
 */
async function tokenCommand() {
	try {
		const token = await storage.getToken()

		if (!token) {
			console.log(`${colors.dim}No token found${colors.reset}`)
			console.log(`\nRun ${colors.cyan}oauth.do login${colors.reset} to authenticate`)
			return
		}

		console.log(token)
	} catch (error) {
		printError('Failed to get token', error instanceof Error ? error : undefined)
		process.exit(1)
	}
}

/**
 * Status command - show authentication and storage status
 */
async function statusCommand() {
	try {
		console.log(`${colors.bright}OAuth.do Status${colors.reset}\n`)

		// Get storage info
		const fileStorage = storage as SecureFileTokenStorage
		if (typeof fileStorage.getStorageInfo === 'function') {
			const storageInfo = await fileStorage.getStorageInfo()
			console.log(`${colors.cyan}Storage:${colors.reset} ${colors.green}Secure File${colors.reset}`)
			console.log(`  ${colors.dim}Using ~/.oauth.do/token with 0600 permissions${colors.reset}`)
		}

		// Get auth status
		const token = await storage.getToken()
		if (!token) {
			console.log(`\n${colors.cyan}Auth:${colors.reset} ${colors.dim}Not authenticated${colors.reset}`)
			console.log(`\nRun ${colors.cyan}oauth.do login${colors.reset} to authenticate`)
			return
		}

		const authResult = await auth(token)
		if (authResult.user) {
			console.log(`\n${colors.cyan}Auth:${colors.reset} ${colors.green}Authenticated${colors.reset}`)
			if (authResult.user.email) {
				console.log(`  ${colors.dim}${authResult.user.email}${colors.reset}`)
			}
		} else {
			console.log(`\n${colors.cyan}Auth:${colors.reset} ${colors.yellow}Token expired or invalid${colors.reset}`)
			console.log(`\nRun ${colors.cyan}oauth.do login${colors.reset} to re-authenticate`)
		}
	} catch (error) {
		printError('Failed to get status', error instanceof Error ? error : undefined)
		process.exit(1)
	}
}

/**
 * Auto login or show current user
 * If already logged in with valid token, show user info
 * If not logged in or token expired, start login flow
 */
async function autoLoginOrShowUser() {
	try {
		// Check if we have a stored token
		const token = await storage.getToken()

		if (token) {
			// Verify the token is still valid
			const authResult = await auth(token)

			if (authResult.user) {
				// Already logged in - show user info
				console.log(`${colors.green}✓${colors.reset} Already authenticated\n`)
				if (authResult.user.name) {
					console.log(`  ${colors.bright}${authResult.user.name}${colors.reset}`)
				}
				if (authResult.user.email) {
					console.log(`  ${colors.gray}${authResult.user.email}${colors.reset}`)
				}
				if (authResult.user.id) {
					console.log(`  ${colors.dim}ID: ${authResult.user.id}${colors.reset}`)
				}
				return
			}
			// Token exists but is invalid/expired - continue to login
			printInfo('Session expired, logging in again...\n')
		}

		// Not logged in - start login flow
		await loginCommand()
	} catch (error) {
		// If auth check fails, try to login
		await loginCommand()
	}
}

/**
 * Main CLI function
 */
async function main() {
	configureFromEnv()

	const args = process.argv.slice(2)

	// Handle flags
	if (args.includes('--help') || args.includes('-h')) {
		printHelp()
		process.exit(0)
	}

	if (args.includes('--version') || args.includes('-v')) {
		printVersion()
		process.exit(0)
	}

	if (args.includes('--debug')) {
		process.env.DEBUG = 'true'
	}

	// Get command
	const command = args.find((arg) => !arg.startsWith('--'))

	switch (command) {
		case 'login':
			await loginCommand()
			break

		case undefined:
			// Default: check if logged in, login if not
			await autoLoginOrShowUser()
			break

		case 'logout':
			await logoutCommand()
			break

		case 'whoami':
			await whoamiCommand()
			break

		case 'token':
			await tokenCommand()
			break

		case 'status':
			await statusCommand()
			break

		default:
			printError(`Unknown command: ${command}`)
			console.log(`\nRun ${colors.cyan}oauth.do --help${colors.reset} for usage information`)
			process.exit(1)
	}
}

// Run CLI
main().catch((error) => {
	printError('Unexpected error', error)
	process.exit(1)
})

export { main }
