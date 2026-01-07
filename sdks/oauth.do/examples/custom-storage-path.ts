/**
 * Example: Using custom storage path for tokens
 *
 * This demonstrates how to configure oauth.do to use a custom
 * token storage path instead of the default ~/.oauth.do/token
 */

import { configure, getToken, auth } from '../src/index.js'

// Configure oauth.do to use a custom storage path
configure({
	storagePath: '~/.studio/tokens.json'
})

// Now all token operations will use the custom path
async function example() {
	// Get token will look in ~/.studio/tokens.json
	const token = await getToken()
	console.log('Token from custom path:', token ? 'Found' : 'Not found')

	// Auth provider will also use the custom path
	const getAuth = auth()
	const authToken = await getAuth()
	console.log('Auth token:', authToken ? 'Found' : 'Not found')
}

// Example for db.sb integration
async function dbSbExample() {
	// Configure oauth.do to use db.sb's token location
	configure({
		storagePath: '~/.studio/tokens.json',
		apiUrl: 'https://apis.do',
		clientId: 'client_01JQYTRXK9ZPD8JPJTKDCRB656'
	})

	// Now all authentication will use ~/.studio/tokens.json
	const token = await getToken()
	if (!token) {
		console.log('No token found. Run: npm run login')
		return
	}

	console.log('Authenticated with token from ~/.studio/tokens.json')
}

// Run the examples
// Uncomment to run:
// example().catch(console.error)
