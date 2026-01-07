/**
 * Git Object Format Implementation
 *
 * Git objects are stored with a header format: `<type> <size>\0<content>`
 * Valid types: blob, tree, commit, tag
 */

const VALID_TYPES = ['blob', 'tree', 'commit', 'tag'] as const
export type GitObjectType = (typeof VALID_TYPES)[number]

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Create a git object header: `<type> <size>\0`
 */
export function createHeader(type: string, size: number): Uint8Array {
  const headerString = `${type} ${size}\0`
  return encoder.encode(headerString)
}

/**
 * Parse a git object header from data
 * Returns the type, size, and offset where content begins
 */
export function parseHeader(data: Uint8Array): {
  type: string
  size: number
  contentOffset: number
} {
  if (data.length === 0) {
    throw new Error('Cannot parse header: empty data')
  }

  // Find the null byte
  const nullIndex = data.indexOf(0x00)
  if (nullIndex === -1) {
    throw new Error('Invalid header: missing null byte terminator')
  }

  // Decode the header string
  const headerString = decoder.decode(data.slice(0, nullIndex))

  // Find the space separator
  const spaceIndex = headerString.indexOf(' ')
  if (spaceIndex === -1) {
    throw new Error('Invalid header: missing space separator')
  }

  const type = headerString.slice(0, spaceIndex)
  const sizeString = headerString.slice(spaceIndex + 1)

  // Validate type
  if (!VALID_TYPES.includes(type as GitObjectType)) {
    throw new Error(`Invalid object type: ${type}`)
  }

  // Validate and parse size
  if (!/^\d+$/.test(sizeString)) {
    throw new Error(`Invalid size: ${sizeString}`)
  }

  const size = parseInt(sizeString, 10)
  if (size < 0 || !Number.isFinite(size)) {
    throw new Error(`Invalid size: ${size}`)
  }

  return {
    type,
    size,
    contentOffset: nullIndex + 1,
  }
}

/**
 * Create a full git object (header + content)
 */
export function createGitObject(type: string, content: Uint8Array): Uint8Array {
  const header = createHeader(type, content.length)
  const result = new Uint8Array(header.length + content.length)
  result.set(header)
  result.set(content, header.length)
  return result
}

/**
 * Parse a full git object and return type and content
 */
export function parseGitObject(data: Uint8Array): {
  type: string
  content: Uint8Array
} {
  const { type, size, contentOffset } = parseHeader(data)

  const actualContentLength = data.length - contentOffset
  if (actualContentLength !== size) {
    throw new Error(
      `Content size mismatch: header says ${size} bytes, but found ${actualContentLength} bytes`
    )
  }

  const content = data.slice(contentOffset)

  return {
    type,
    content,
  }
}
