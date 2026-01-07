/**
 * CredentialDO - Durable Object for secure credential storage
 *
 * Stores encrypted credentials for workflow integrations.
 */

import { DurableObject } from 'cloudflare:workers'

export interface Env {
  WORKFLOW_DO: DurableObjectNamespace
  EXECUTION_DO: DurableObjectNamespace
  CREDENTIAL_DO: DurableObjectNamespace<CredentialDO>
  ENCRYPTION_KEY?: string
}

interface Credential {
  id: string
  name: string
  type: string
  encryptedData: string
  createdAt: string
  updatedAt: string
}

interface CredentialMetadata {
  id: string
  name: string
  type: string
  createdAt: string
  updatedAt: string
}

export class CredentialDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql

    // Initialize schema
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_credentials_name ON credentials(name);
      CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);
    `)
  }

  /**
   * Generate a unique credential ID
   */
  private generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * Encrypt credential data
   * TODO: Implement proper encryption using Web Crypto API
   */
  private async encrypt(data: Record<string, unknown>): Promise<string> {
    // For now, just base64 encode - implement real encryption later
    return btoa(JSON.stringify(data))
  }

  /**
   * Decrypt credential data
   */
  private async decrypt(encryptedData: string): Promise<Record<string, unknown>> {
    // For now, just base64 decode - implement real decryption later
    return JSON.parse(atob(encryptedData))
  }

  /**
   * Create a new credential
   */
  async createCredential(config: {
    name: string
    type: string
    data: Record<string, unknown>
  }): Promise<CredentialMetadata> {
    const now = new Date().toISOString()
    const id = this.generateId()
    const encryptedData = await this.encrypt(config.data)

    this.sql.exec(
      `INSERT INTO credentials (id, name, type, encrypted_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      config.name,
      config.type,
      encryptedData,
      now,
      now
    )

    return {
      id,
      name: config.name,
      type: config.type,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Get credential by name (with decrypted data)
   */
  async getCredential(name: string): Promise<{ metadata: CredentialMetadata; data: Record<string, unknown> } | null> {
    const result = this.sql.exec<{
      id: string
      name: string
      type: string
      encrypted_data: string
      created_at: string
      updated_at: string
    }>(`SELECT * FROM credentials WHERE name = ?`, name)

    const row = result.toArray()[0]
    if (!row) return null

    const data = await this.decrypt(row.encrypted_data)

    return {
      metadata: {
        id: row.id,
        name: row.name,
        type: row.type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      data
    }
  }

  /**
   * Get credential metadata only (without decrypted data)
   */
  getCredentialMetadata(name: string): CredentialMetadata | null {
    const result = this.sql.exec<{
      id: string
      name: string
      type: string
      created_at: string
      updated_at: string
    }>(`SELECT id, name, type, created_at, updated_at FROM credentials WHERE name = ?`, name)

    const row = result.toArray()[0]
    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  /**
   * List all credentials (metadata only)
   */
  listCredentials(): CredentialMetadata[] {
    const result = this.sql.exec<{
      id: string
      name: string
      type: string
      created_at: string
      updated_at: string
    }>(`SELECT id, name, type, created_at, updated_at FROM credentials ORDER BY name`)

    return result.toArray().map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * Update credential data
   */
  async updateCredential(name: string, data: Record<string, unknown>): Promise<CredentialMetadata | null> {
    const existing = this.getCredentialMetadata(name)
    if (!existing) return null

    const now = new Date().toISOString()
    const encryptedData = await this.encrypt(data)

    this.sql.exec(
      `UPDATE credentials SET encrypted_data = ?, updated_at = ? WHERE name = ?`,
      encryptedData,
      now,
      name
    )

    return {
      ...existing,
      updatedAt: now
    }
  }

  /**
   * Delete a credential
   */
  deleteCredential(name: string): boolean {
    const existing = this.getCredentialMetadata(name)
    if (!existing) return false

    this.sql.exec(`DELETE FROM credentials WHERE name = ?`, name)
    return true
  }

  /**
   * Handle HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // GET /credentials - List all credentials
      if (request.method === 'GET' && path === '/credentials') {
        return Response.json(this.listCredentials())
      }

      // GET /credentials/:name - Get credential by name
      if (request.method === 'GET' && path.startsWith('/credentials/')) {
        const name = decodeURIComponent(path.split('/')[2])
        const withData = url.searchParams.get('withData') === 'true'

        if (withData) {
          const credential = await this.getCredential(name)
          if (!credential) {
            return Response.json({ error: 'Credential not found' }, { status: 404 })
          }
          return Response.json(credential)
        } else {
          const metadata = this.getCredentialMetadata(name)
          if (!metadata) {
            return Response.json({ error: 'Credential not found' }, { status: 404 })
          }
          return Response.json(metadata)
        }
      }

      // POST /credentials - Create credential
      if (request.method === 'POST' && path === '/credentials') {
        const body = await request.json() as {
          name: string
          type: string
          data: Record<string, unknown>
        }
        const credential = await this.createCredential(body)
        return Response.json(credential)
      }

      // PUT /credentials/:name - Update credential
      if (request.method === 'PUT' && path.startsWith('/credentials/')) {
        const name = decodeURIComponent(path.split('/')[2])
        const body = await request.json() as { data: Record<string, unknown> }
        const credential = await this.updateCredential(name, body.data)
        if (!credential) {
          return Response.json({ error: 'Credential not found' }, { status: 404 })
        }
        return Response.json(credential)
      }

      // DELETE /credentials/:name - Delete credential
      if (request.method === 'DELETE' && path.startsWith('/credentials/')) {
        const name = decodeURIComponent(path.split('/')[2])
        const deleted = this.deleteCredential(name)
        if (!deleted) {
          return Response.json({ error: 'Credential not found' }, { status: 404 })
        }
        return Response.json({ deleted: true })
      }

      return Response.json({ error: 'Not found' }, { status: 404 })
    } catch (error) {
      console.error('CredentialDO error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        { status: 500 }
      )
    }
  }
}
