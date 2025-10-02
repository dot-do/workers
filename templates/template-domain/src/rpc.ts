/**
 * RPC interface for {{SERVICE_NAME}}
 * @module {{SERVICE_NAME}}/rpc
 */

import type { Env } from './index'

/**
 * Creates the RPC interface for this service
 * This is used by other services to call this service via service bindings
 */
export function createRpcInterface(env: Env) {
  return {
    // Export RPC methods here
    // These will be available to other services via service bindings

    async getItem(id: string) {
      // Implementation
    },

    async listItems(options: { page?: number; limit?: number }) {
      // Implementation
    },

    async createItem(data: { name: string }) {
      // Implementation
    },

    async updateItem(id: string, data: { name?: string }) {
      // Implementation
    },

    async deleteItem(id: string) {
      // Implementation
    },
  }
}

/**
 * Type definition for the RPC interface
 * Other services can import this to get type safety
 */
export type {{SERVICE_CLASS}}Rpc = ReturnType<typeof createRpcInterface>
