/**
 * rpc.do/env/node - Node.js environment adapter (OPTIONAL)
 *
 * NOTE: This import is no longer required! Node.js process.env is now
 * auto-detected. This file is kept for backwards compatibility.
 *
 * For loading .env files, use `import 'rpc.do/dotenv'` instead.
 *
 * @deprecated Node.js environment is auto-detected - no import needed
 */

import { setEnv } from './index.js'

// Set the global environment from Node.js process.env
if (typeof process !== 'undefined' && process.env) {
  setEnv(process.env as Record<string, string | undefined>)
}
