# GitHub Device Flow

GitHub Device Flow implementation for oauth.do following OAuth 2.0 Device Authorization Grant (RFC 8628).

## Features

- Start GitHub Device Flow authorization
- Poll for access tokens with automatic error handling
- Fetch authenticated GitHub user profile
- Full TypeScript support with comprehensive types
- Handles all error states (authorization_pending, slow_down, expired_token, access_denied)
- Returns numeric GitHub user ID for sqid generation

## Installation

```bash
npm install oauth.do
```

## Usage

### Basic Example

```typescript
import {
  startGitHubDeviceFlow,
  pollGitHubDeviceFlow,
  getGitHubUser
} from 'oauth.do'

// 1. Start device flow
const auth = await startGitHubDeviceFlow({
  clientId: 'Ov23liABCDEFGHIJKLMN', // Your GitHub OAuth App client ID
  scope: 'user:email read:user'      // Optional, defaults to 'user:email read:user'
})

// 2. Display verification instructions to user
console.log(`Visit: ${auth.verificationUri}`)
console.log(`Enter code: ${auth.userCode}`)

// 3. Poll for access token
const token = await pollGitHubDeviceFlow(auth.deviceCode, {
  clientId: 'Ov23liABCDEFGHIJKLMN',
  interval: auth.interval,
  expiresIn: auth.expiresIn
})

console.log('Access token:', token.accessToken)

// 4. Get user profile
const user = await getGitHubUser(token.accessToken)
console.log(`Logged in as ${user.login} (ID: ${user.id})`)
```

### Complete CLI Example

```typescript
import {
  startGitHubDeviceFlow,
  pollGitHubDeviceFlow,
  getGitHubUser
} from 'oauth.do'

async function loginWithGitHub() {
  const clientId = process.env.GITHUB_CLIENT_ID || 'Ov23liABCDEFGHIJKLMN'

  try {
    // Start device flow
    const auth = await startGitHubDeviceFlow({
      clientId,
      scope: 'user:email read:user'
    })

    // Show user instructions
    console.log('\n🔐 GitHub Authentication Required')
    console.log(`\n👉 Visit: ${auth.verificationUri}`)
    console.log(`\n🔑 Enter code: ${auth.userCode}\n`)
    console.log('⏳ Waiting for authorization...\n')

    // Poll for token
    const token = await pollGitHubDeviceFlow(auth.deviceCode, {
      clientId,
      interval: auth.interval,
      expiresIn: auth.expiresIn
    })

    // Get user info
    const user = await getGitHubUser(token.accessToken)

    console.log('✅ Authentication successful!')
    console.log(`\nWelcome, ${user.name || user.login}!`)
    console.log(`Email: ${user.email || 'Not public'}`)
    console.log(`GitHub ID: ${user.id}`)

    return {
      accessToken: token.accessToken,
      user
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message)
    throw error
  }
}

// Usage
const { accessToken, user } = await loginWithGitHub()
```

## API Reference

### `startGitHubDeviceFlow(options)`

Initiates GitHub Device Flow authorization.

**Parameters:**
- `options.clientId` (string, required): GitHub OAuth App client ID
- `options.scope` (string, optional): OAuth scopes, defaults to `'user:email read:user'`
- `options.fetch` (function, optional): Custom fetch implementation

**Returns:** `Promise<GitHubDeviceAuthResponse>`
```typescript
{
  deviceCode: string      // Device verification code
  userCode: string        // User verification code to display
  verificationUri: string // URI for user to visit
  expiresIn: number       // Expiration time in seconds
  interval: number        // Polling interval in seconds
}
```

**Throws:** Error if client ID is missing or request fails

---

### `pollGitHubDeviceFlow(deviceCode, options)`

Polls GitHub's token endpoint until user completes authorization.

**Parameters:**
- `deviceCode` (string, required): Device code from `startGitHubDeviceFlow`
- `options.clientId` (string, required): GitHub OAuth App client ID
- `options.interval` (number, optional): Polling interval in seconds, defaults to 5
- `options.expiresIn` (number, optional): Expiration time in seconds, defaults to 900
- `options.fetch` (function, optional): Custom fetch implementation

**Returns:** `Promise<GitHubTokenResponse>`
```typescript
{
  accessToken: string // Access token for GitHub API
  tokenType: string   // Token type (typically 'bearer')
  scope: string       // Granted scopes
}
```

**Error Handling:**
- `authorization_pending`: Continues polling
- `slow_down`: Increases interval by 5 seconds and continues
- `access_denied`: Throws error (user denied access)
- `expired_token`: Throws error (device code expired)
- Throws error if polling timeout expires

---

### `getGitHubUser(accessToken, options?)`

Fetches authenticated user's profile from GitHub API.

**Parameters:**
- `accessToken` (string, required): GitHub access token
- `options.fetch` (function, optional): Custom fetch implementation

**Returns:** `Promise<GitHubUser>`
```typescript
{
  id: number              // Numeric GitHub user ID (for sqid generation)
  login: string           // GitHub username
  email: string | null    // User's email (may be null if not public)
  name: string | null     // User's display name
  avatarUrl: string       // Avatar image URL
}
```

**Important:** The `id` field is a number, which is critical for sqid generation.

**Throws:** Error if access token is missing or request fails

## TypeScript Types

```typescript
export interface GitHubDeviceFlowOptions {
  clientId: string
  scope?: string
  fetch?: typeof fetch
}

export interface GitHubDeviceAuthResponse {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export interface GitHubTokenResponse {
  accessToken: string
  tokenType: string
  scope: string
}

export interface GitHubUser {
  id: number
  login: string
  email: string | null
  name: string | null
  avatarUrl: string
}
```

## Error Handling

The implementation handles all GitHub Device Flow error states:

```typescript
try {
  const auth = await startGitHubDeviceFlow({ clientId: '...' })
  const token = await pollGitHubDeviceFlow(auth.deviceCode, {
    clientId: '...',
    interval: auth.interval,
    expiresIn: auth.expiresIn
  })
} catch (error) {
  if (error.message.includes('Access denied')) {
    // User denied authorization
    console.log('User cancelled login')
  } else if (error.message.includes('expired')) {
    // Device code expired
    console.log('Login timeout - please try again')
  } else {
    // Other errors
    console.error('Login failed:', error.message)
  }
}
```

## Testing

Comprehensive test suite with 16 tests covering:
- Device flow initiation
- Custom scopes
- Token polling
- Authorization pending state
- Slow down handling
- Error states (access denied, expired token)
- User profile fetching
- Numeric ID validation

Run tests:
```bash
npm test -- github-device
```

## References

- [GitHub Device Flow Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://tools.ietf.org/html/rfc8628)
- [GitHub REST API - Get authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user)

## License

MIT
