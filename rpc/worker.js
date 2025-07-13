// worker.js  ──────────────────────────────────────────────────
import * as utils from './utils.js';
import { graftModule } from './graft-module.js';
import { WorkerEntrypoint } from 'cloudflare:workers';

class MyService extends WorkerEntrypoint {
  /* your own RPC methods here */
}

// Optionally keep the helper available as a *named* export.
export { graftModule };

/**
 * The default export is the class *after* it has been patched.
 * Cloudflare’s runtime sees exactly what it expects: a WorkerEntrypoint subclass.
 */
export default graftModule(MyService, utils);