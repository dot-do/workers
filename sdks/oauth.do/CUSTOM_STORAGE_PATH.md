# Custom Token Storage Path

oauth.do now supports configurable token storage paths, allowing you to specify where authentication tokens should be stored.

## Overview

By default, oauth.do stores tokens in `~/.oauth.do/token`. With the new `storagePath` configuration option, you can customize this location to fit your application's needs.

## Usage

### Basic Configuration

```typescript
import { configure } from 'oauth.do'

// Configure custom storage path
configure({
  storagePath: '~/.studio/tokens.json'
})
```

### Using with getToken()

```typescript
import { configure, getToken } from 'oauth.do'

configure({
  storagePath: '~/.studio/tokens.json'
})

// Token will be read from ~/.studio/tokens.json
const token = await getToken()
```

### Using with auth()

```typescript
import { configure, auth } from 'oauth.do'

configure({
  storagePath: '~/.studio/tokens.json'
})

// Auth provider will use the custom path
const getAuth = auth()
const token = await getAuth()
```

### Direct Storage Creation

```typescript
import { createSecureStorage } from 'oauth.do'

// Create storage with custom path
const storage = createSecureStorage('~/.studio/tokens.json')

await storage.setToken('your-token')
const token = await storage.getToken()
```

## Path Format

- **Tilde expansion**: Paths starting with `~/` are expanded to your home directory
  - `~/.studio/tokens.json` → `/Users/username/.studio/tokens.json` (macOS/Linux)
  - `~/.studio/tokens.json` → `C:\Users\username\.studio\tokens.json` (Windows)

- **Absolute paths**: You can also use absolute paths
  - `/var/app/tokens.json`
  - `C:\app\tokens.json`

## Security

Token files created at custom paths maintain the same security as default storage:

- **File permissions**: Automatically set to `0600` (owner read/write only)
- **Directory creation**: Parent directories are created with `0700` permissions
- **JSON format**: Tokens are stored as JSON with support for refresh tokens and expiration

## Integration with db.sb

For db.sb integration, configure oauth.do to use db.sb's token location:

```typescript
import { configure } from 'oauth.do'

configure({
  storagePath: '~/.studio/tokens.json',
  apiUrl: 'https://apis.do',
  clientId: 'client_01JQYTRXK9ZPD8JPJTKDCRB656'
})
```

## Environment Variable

You can also set the storage path via environment variable:

```bash
export OAUTH_STORAGE_PATH=~/.studio/tokens.json
```

## API Reference

### OAuthConfig Interface

```typescript
interface OAuthConfig {
  // ... existing options

  /**
   * Custom path for token storage
   * Supports ~ for home directory (e.g., '~/.studio/tokens.json')
   * @default '~/.oauth.do/token'
   */
  storagePath?: string
}
```

### SecureFileTokenStorage Constructor

```typescript
class SecureFileTokenStorage {
  constructor(customPath?: string)
}
```

### createSecureStorage Function

```typescript
function createSecureStorage(storagePath?: string): TokenStorage
```

## Migration

If you have existing tokens in `~/.oauth.do/token` and switch to a custom path, you'll need to:

1. Copy the token file to the new location, or
2. Re-authenticate to generate a new token

The library does not automatically migrate tokens between paths.

## Examples

See `examples/custom-storage-path.ts` for a complete example.

## Testing

Run tests to verify custom path functionality:

```bash
npm test storage.test.ts
```

The test suite includes:
- Custom path creation and usage
- Tilde expansion
- File permissions verification
- Token storage and retrieval
