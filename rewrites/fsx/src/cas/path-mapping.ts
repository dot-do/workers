/**
 * CAS Path Mapping Functions
 *
 * Maps between content hashes and file paths in the content-addressable storage.
 * Uses git-style object storage: objects/xx/yyyy... where xx is first 2 hex chars.
 *
 * Supports both SHA-1 (40 char) and SHA-256 (64 char) hashes.
 */

/**
 * Validate that a string contains only hexadecimal characters
 */
function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str)
}

/**
 * Convert a hash to a storage path
 * @param hash - 40 or 64 character hex string (SHA-1 or SHA-256)
 * @returns Path in format: objects/xx/yyyy...
 */
export function hashToPath(hash: string): string {
  // Validate hash length (SHA-1 = 40, SHA-256 = 64)
  if (hash.length !== 40 && hash.length !== 64) {
    throw new Error(`Invalid hash length: expected 40 (SHA-1) or 64 (SHA-256), got ${hash.length}`)
  }

  // Validate hex characters
  if (!isValidHex(hash)) {
    throw new Error('Invalid hash: contains non-hex characters')
  }

  // Normalize to lowercase
  const normalizedHash = hash.toLowerCase()

  // Split into directory (first 2 chars) and filename (remaining chars)
  const dir = normalizedHash.slice(0, 2)
  const filename = normalizedHash.slice(2)

  return `objects/${dir}/${filename}`
}

/**
 * Extract a hash from a storage path
 * @param path - Path in format: objects/xx/yyyy...
 * @returns Lowercase hex hash string
 */
export function pathToHash(path: string): string {
  // Validate path starts with 'objects/'
  if (!path.startsWith('objects/')) {
    throw new Error('Invalid path: must start with "objects/"')
  }

  // Split path into components
  const parts = path.split('/')

  // Expected format: objects/xx/yyyy... (3 parts)
  if (parts.length !== 3) {
    throw new Error('Invalid path: expected format "objects/xx/yyyy..."')
  }

  const [, dir, filename] = parts

  // Validate directory is exactly 2 characters
  if (dir.length !== 2) {
    throw new Error(`Invalid path: directory must be 2 characters, got ${dir.length}`)
  }

  // Validate directory contains only hex characters
  if (!isValidHex(dir)) {
    throw new Error('Invalid path: directory contains non-hex characters')
  }

  // Validate filename contains only hex characters
  if (!isValidHex(filename)) {
    throw new Error('Invalid path: filename contains non-hex characters')
  }

  // Combine and normalize to lowercase
  const hash = (dir + filename).toLowerCase()

  // Validate resulting hash length (SHA-1 = 40, SHA-256 = 64)
  if (hash.length !== 40 && hash.length !== 64) {
    throw new Error(`Invalid hash length: expected 40 (SHA-1) or 64 (SHA-256), got ${hash.length}`)
  }

  return hash
}
