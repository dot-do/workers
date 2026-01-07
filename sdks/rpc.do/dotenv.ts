/**
 * rpc.do/dotenv - Load .env file into process.env
 *
 * Import this at your app's entry point to load environment variables
 * from a .env file before using .do SDKs.
 *
 * Note: In Node.js, process.env is auto-detected - you only need this
 * if you want to load variables from a .env file.
 *
 * @example
 * ```typescript
 * // app.ts (entry point)
 * import 'rpc.do/dotenv'
 * import { workflows } from 'workflows.do'
 *
 * // .env file is loaded, SDKs can access DO_API_KEY etc.
 * const flows = await workflows.list()
 * ```
 */

import { config } from 'dotenv'

// Load .env file into process.env
config()
