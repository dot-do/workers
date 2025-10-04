import { WorkerEntrypoint } from 'cloudflare:workers'
import Squids from 'sqids'
import { xxhash32 } from '@taylorzane/hash-wasm'

/**
 * Hash Service - Fast hashing and short ID generation
 */
export default class extends WorkerEntrypoint {
  /**
   * Generate a 32-bit xxHash of the input string
   * @param data - String to hash
   * @returns 32-bit hash as number
   */
  async xxHash32(data: string): Promise<number> {
    const hash = await xxhash32(data)
    console.log(hash)
    return parseInt(hash, 16)
  }

  /**
   * Generate a short, URL-safe ID from a hash of the input string
   * @param data - String to encode
   * @returns Short ID (Sqid)
   */
  async encodeSqid(data: string): Promise<string> {
    const sqids = new Squids()
    const hash = await xxhash32(data)
    return sqids.encode([parseInt(hash, 16)])
  }

  /**
   * HTTP health check endpoint
   */
  fetch(): Response {
    return Response.json({ success: true })
  }
}
