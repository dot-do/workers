/**
 * Type definitions for workers.do
 */

export interface DeployRequest {
  name: string
  code: string
  language?: 'ts' | 'js' | 'mdx'
  minify?: boolean
}

export interface DeployResponse {
  success: boolean
  workerId?: string
  url?: string
  error?: string
}

export interface DispatchRequest {
  worker: string
  method?: string
  path?: string
  body?: any
  headers?: Record<string, string>
}

export interface DispatchResponse {
  success: boolean
  status?: number
  data?: any
  error?: string
}

export interface Worker {
  $id: string
  name: string
  url: string
  createdAt: string
  deployedAt?: string
  accessedAt?: string
  linkedFolders?: string[]
}

export interface ListOptions {
  sortBy?: 'created' | 'deployed' | 'accessed'
  limit?: number
}

export interface LinkOptions {
  folder: string
}
