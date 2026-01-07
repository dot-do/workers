/**
 * Airbyte Client SDK
 */

import type {
  Source,
  CreateSourceInput,
  Destination,
  CreateDestinationInput,
  Connection,
  ConnectionConfig,
  SyncJob,
  SyncStatus,
  SchemaDiscoveryResult,
  CheckResult,
  SourceDefinition,
  DestinationDefinition
} from './types'

export interface AirbyteOptions {
  workspace: string
  baseUrl?: string
  apiKey?: string
}

export class Airbyte {
  private workspace: string
  private baseUrl: string
  private apiKey?: string

  public readonly sources: SourcesAPI
  public readonly destinations: DestinationsAPI
  public readonly connections: ConnectionsAPI
  public readonly catalog: CatalogAPI

  constructor(options: AirbyteOptions) {
    this.workspace = options.workspace
    this.baseUrl = options.baseUrl ?? 'https://airbyte.do'
    this.apiKey = options.apiKey

    this.sources = new SourcesAPI(this)
    this.destinations = new DestinationsAPI(this)
    this.connections = new ConnectionsAPI(this)
    this.catalog = new CatalogAPI(this)
  }

  /** @internal */
  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/v1/${this.workspace}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Airbyte API error: ${response.status} ${error}`)
    }

    return response.json() as Promise<T>
  }
}

class SourcesAPI {
  constructor(private client: Airbyte) {}

  async create(input: CreateSourceInput): Promise<Source> {
    return this.client._request<Source>('POST', '/sources', input)
  }

  async get(id: string): Promise<Source> {
    return this.client._request<Source>('GET', `/sources/${id}`)
  }

  async list(): Promise<Source[]> {
    return this.client._request<Source[]>('GET', '/sources')
  }

  async update(id: string, input: Partial<CreateSourceInput>): Promise<Source> {
    return this.client._request<Source>('PATCH', `/sources/${id}`, input)
  }

  async delete(id: string): Promise<void> {
    await this.client._request<void>('DELETE', `/sources/${id}`)
  }

  async discover(id: string): Promise<SchemaDiscoveryResult> {
    return this.client._request<SchemaDiscoveryResult>('POST', `/sources/${id}/discover`)
  }

  async check(id: string): Promise<CheckResult> {
    return this.client._request<CheckResult>('POST', `/sources/${id}/check`)
  }
}

class DestinationsAPI {
  constructor(private client: Airbyte) {}

  async create(input: CreateDestinationInput): Promise<Destination> {
    return this.client._request<Destination>('POST', '/destinations', input)
  }

  async get(id: string): Promise<Destination> {
    return this.client._request<Destination>('GET', `/destinations/${id}`)
  }

  async list(): Promise<Destination[]> {
    return this.client._request<Destination[]>('GET', '/destinations')
  }

  async update(id: string, input: Partial<CreateDestinationInput>): Promise<Destination> {
    return this.client._request<Destination>('PATCH', `/destinations/${id}`, input)
  }

  async delete(id: string): Promise<void> {
    await this.client._request<void>('DELETE', `/destinations/${id}`)
  }

  async check(id: string): Promise<CheckResult> {
    return this.client._request<CheckResult>('POST', `/destinations/${id}/check`)
  }
}

class ConnectionsAPI {
  constructor(private client: Airbyte) {}

  async create(input: ConnectionConfig): Promise<Connection> {
    return this.client._request<Connection>('POST', '/connections', input)
  }

  async get(id: string): Promise<Connection> {
    return this.client._request<Connection>('GET', `/connections/${id}`)
  }

  async list(): Promise<Connection[]> {
    return this.client._request<Connection[]>('GET', '/connections')
  }

  async update(id: string, input: Partial<ConnectionConfig>): Promise<Connection> {
    return this.client._request<Connection>('PATCH', `/connections/${id}`, input)
  }

  async delete(id: string): Promise<void> {
    await this.client._request<void>('DELETE', `/connections/${id}`)
  }

  async sync(id: string): Promise<SyncJob> {
    return this.client._request<SyncJob>('POST', `/connections/${id}/sync`)
  }

  async status(id: string): Promise<{ state: SyncStatus; progress: Record<string, number>; started_at?: string }> {
    return this.client._request('GET', `/connections/${id}/status`)
  }

  async jobs(id: string): Promise<SyncJob[]> {
    return this.client._request<SyncJob[]>('GET', `/connections/${id}/jobs`)
  }

  async cancelJob(connectionId: string, jobId: string): Promise<SyncJob> {
    return this.client._request<SyncJob>('POST', `/connections/${connectionId}/jobs/${jobId}/cancel`)
  }
}

class CatalogAPI {
  constructor(private client: Airbyte) {}

  readonly sources = {
    list: async (): Promise<SourceDefinition[]> => {
      return this.client._request<SourceDefinition[]>('GET', '/catalog/sources')
    },
    get: async (id: string): Promise<SourceDefinition> => {
      return this.client._request<SourceDefinition>('GET', `/catalog/sources/${id}`)
    }
  }

  readonly destinations = {
    list: async (): Promise<DestinationDefinition[]> => {
      return this.client._request<DestinationDefinition[]>('GET', '/catalog/destinations')
    },
    get: async (id: string): Promise<DestinationDefinition> => {
      return this.client._request<DestinationDefinition>('GET', `/catalog/destinations/${id}`)
    }
  }
}
