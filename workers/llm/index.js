/**
 * @dotdo/worker-llm - LLM Gateway with billing and analytics (llm.do)
 *
 * Unified LLM access with built-in metering, billing, and analytics:
 * - Multi-model support (Claude, GPT-4, Gemini, open source)
 * - Per-token billing integrated with Stripe
 * - Usage analytics in dashboard
 * - BYOK - Customers can use their own API keys
 * - AI Gateway caching for cost optimization
 * - Per-customer rate limiting and quotas
 *
 * Exposes LLM via multi-transport RPC:
 * - Workers RPC: env.LLM.complete(options)
 * - REST: POST /api/complete
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */
import { RPC } from '@dotdo/rpc';
const llmAPI = {
    /**
     * Generate a completion - automatically metered and billed
     */
    async complete(options) {
        // TODO: Implement AI Gateway routing
        // TODO: Track usage for billing
        // TODO: Log to analytics pipeline
        throw new Error('Not implemented - see beads issue for implementation plan');
    },
    /**
     * Stream a completion - usage tracked on completion
     */
    async stream(options) {
        // TODO: Implement streaming with AI Gateway
        // TODO: Track usage on stream completion
        throw new Error('Not implemented - see beads issue for implementation plan');
    },
    /**
     * List available models
     */
    async models() {
        return [
            'claude-3-opus',
            'claude-3-sonnet',
            'claude-3-haiku',
            'gpt-4',
            'gpt-4-turbo',
            'gpt-3.5-turbo',
            'gemini-pro',
            'gemini-ultra',
        ];
    },
    /**
     * Get usage for a customer
     */
    async usage(customerId, period) {
        // TODO: Query analytics pipeline
        throw new Error('Not implemented - see beads issue for implementation plan');
    },
};
export default RPC(llmAPI);
