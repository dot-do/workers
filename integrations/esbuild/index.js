/**
 * @dotdo/worker-esbuild - esbuild-wasm as RPC worker
 *
 * Exposes esbuild via multi-transport RPC:
 * - Workers RPC: env.ESBUILD.transform(code, options)
 * - REST: POST /api/transform
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */
import * as esbuild from 'esbuild-wasm';
import { RPC } from '@dotdo/rpc';
// Initialize esbuild-wasm
let initialized = false;
async function ensureInitialized() {
    if (!initialized) {
        await esbuild.initialize({
            wasmURL: 'https://unpkg.com/esbuild-wasm/esbuild.wasm',
        });
        initialized = true;
    }
}
const esbuildAPI = {
    async transform(code, options) {
        await ensureInitialized();
        return esbuild.transform(code, options);
    },
    async build(options) {
        await ensureInitialized();
        return esbuild.build(options);
    },
};
export default RPC(esbuildAPI);
