/**
 * REST Protocol Handler
 *
 * Mounts Hono REST API application
 */

import type { Hono } from 'hono'
import type { RestHandler } from './types'

/**
 * Mount REST API handler
 *
 * Simply returns the Hono app to be mounted at /api
 */
export function handleRestApi(handler: RestHandler): Hono {
  return handler
}
