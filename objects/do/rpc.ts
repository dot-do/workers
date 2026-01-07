/**
 * dotdo/rpc - DO that expects dependencies as RPC Worker bindings
 *
 * Light bundle, offloads heavy deps (jose, etc.) to RPC workers.
 * Requires conventional binding names:
 * - env.JOSE
 * - env.ESBUILD
 * - env.MDX
 * - env.STRIPE
 * - env.WORKOS
 * - env.CLOUDFLARE
 */

export { DO } from './do-rpc'
export type { DOConfig, DOEnv } from './types'
