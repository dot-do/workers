/**
 * TieredFS - Multi-tier filesystem with automatic placement
 */

export interface TieredFSConfig {
  /** Hot tier (Durable Object) - fast, small files */
  hot: DurableObjectNamespace
  /** Warm tier (R2) - large files */
  warm?: R2Bucket
  /** Cold tier (archive) - infrequent access */
  cold?: R2Bucket
  /** Size thresholds */
  thresholds?: {
    /** Max size for hot tier (default: 1MB) */
    hotMaxSize?: number
    /** Max size for warm tier (default: 100MB) */
    warmMaxSize?: number
  }
  /** Promotion policy */
  promotionPolicy?: 'none' | 'on-access' | 'aggressive'
}

const DEFAULT_CONFIG: Required<Omit<TieredFSConfig, 'hot' | 'warm' | 'cold'>> = {
  thresholds: {
    hotMaxSize: 1024 * 1024, // 1MB
    warmMaxSize: 100 * 1024 * 1024, // 100MB
  },
  promotionPolicy: 'on-access',
}

/**
 * TieredFS - Automatically place files in appropriate storage tier
 */
export class TieredFS {
  private hotStub: DurableObjectStub
  private warm?: R2Bucket
  private cold?: R2Bucket
  private config: Required<Omit<TieredFSConfig, 'hot' | 'warm' | 'cold'>>

  constructor(config: TieredFSConfig) {
    const id = config.hot.idFromName('tiered')
    this.hotStub = config.hot.get(id)
    this.warm = config.warm
    this.cold = config.cold
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Determine storage tier based on file size
   */
  private selectTier(size: number): 'hot' | 'warm' | 'cold' {
    if (size <= (this.config.thresholds.hotMaxSize ?? 1024 * 1024)) {
      return 'hot'
    }
    if (this.warm && size <= (this.config.thresholds.warmMaxSize ?? 100 * 1024 * 1024)) {
      return 'warm'
    }
    if (this.cold) {
      return 'cold'
    }
    // Fall back to warm or hot
    return this.warm ? 'warm' : 'hot'
  }

  /**
   * Write file with automatic tier selection
   */
  async writeFile(path: string, data: Uint8Array | string): Promise<{ tier: string }> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const tier = this.selectTier(bytes.length)

    if (tier === 'hot') {
      // Write to Durable Object
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'writeFile',
          params: {
            path,
            data: this.encodeBase64(bytes),
            encoding: 'base64',
          },
        }),
      })
    } else if (tier === 'warm' && this.warm) {
      // Write to R2
      await this.warm.put(path, bytes)
      // Update metadata in hot tier
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'setMetadata',
          params: { path, tier: 'warm', size: bytes.length },
        }),
      })
    } else if (tier === 'cold' && this.cold) {
      // Write to archive
      await this.cold.put(path, bytes)
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'setMetadata',
          params: { path, tier: 'cold', size: bytes.length },
        }),
      })
    }

    return { tier }
  }

  /**
   * Read file from appropriate tier
   */
  async readFile(path: string): Promise<{ data: Uint8Array; tier: string }> {
    // Check metadata to find tier
    const response = await this.hotStub.fetch('http://fsx.do/rpc', {
      method: 'POST',
      body: JSON.stringify({
        method: 'getMetadata',
        params: { path },
      }),
    })

    const metadata = (await response.json()) as { tier: string; size: number } | null

    if (!metadata || metadata.tier === 'hot') {
      // Read from hot tier
      const readResponse = await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'readFile',
          params: { path },
        }),
      })
      const result = (await readResponse.json()) as { data: string; encoding: string }
      return {
        data: this.decodeBase64(result.data),
        tier: 'hot',
      }
    }

    if (metadata.tier === 'warm' && this.warm) {
      const object = await this.warm.get(path)
      if (!object) {
        throw new Error(`File not found: ${path}`)
      }
      const data = new Uint8Array(await object.arrayBuffer())

      // Optionally promote to hot tier
      if (this.config.promotionPolicy === 'on-access' && data.length <= (this.config.thresholds.hotMaxSize ?? 1024 * 1024)) {
        await this.promote(path, data, 'warm', 'hot')
      }

      return { data, tier: 'warm' }
    }

    if (metadata.tier === 'cold' && this.cold) {
      const object = await this.cold.get(path)
      if (!object) {
        throw new Error(`File not found: ${path}`)
      }
      const data = new Uint8Array(await object.arrayBuffer())

      // Optionally promote to warm tier
      if (this.config.promotionPolicy === 'on-access' && this.warm) {
        await this.promote(path, data, 'cold', 'warm')
      }

      return { data, tier: 'cold' }
    }

    throw new Error(`File not found: ${path}`)
  }

  /**
   * Promote a file to a higher tier
   */
  private async promote(path: string, data: Uint8Array, fromTier: string, toTier: string): Promise<void> {
    if (toTier === 'hot') {
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'writeFile',
          params: {
            path,
            data: this.encodeBase64(data),
            encoding: 'base64',
          },
        }),
      })
    } else if (toTier === 'warm' && this.warm) {
      await this.warm.put(path, data)
    }

    // Update metadata
    await this.hotStub.fetch('http://fsx.do/rpc', {
      method: 'POST',
      body: JSON.stringify({
        method: 'setMetadata',
        params: { path, tier: toTier, size: data.length },
      }),
    })
  }

  /**
   * Demote a file to a lower tier (for cost optimization)
   */
  async demote(path: string, toTier: 'warm' | 'cold'): Promise<void> {
    const { data, tier: currentTier } = await this.readFile(path)

    if (toTier === 'warm' && this.warm && currentTier === 'hot') {
      await this.warm.put(path, data)
      // Remove from hot tier (keep metadata)
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'demoteFile',
          params: { path, tier: 'warm' },
        }),
      })
    } else if (toTier === 'cold' && this.cold) {
      await this.cold.put(path, data)
      // Remove from current tier
      if (currentTier === 'warm' && this.warm) {
        await this.warm.delete(path)
      }
      await this.hotStub.fetch('http://fsx.do/rpc', {
        method: 'POST',
        body: JSON.stringify({
          method: 'demoteFile',
          params: { path, tier: 'cold' },
        }),
      })
    }
  }

  private encodeBase64(data: Uint8Array): string {
    let binary = ''
    for (const byte of data) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  }

  private decodeBase64(data: string): Uint8Array {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}
