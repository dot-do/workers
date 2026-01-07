import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
/**
 * TDD RED Phase: wrangler.toml observability configuration tests
 *
 * These tests verify that wrangler.toml is properly configured for
 * production observability. Currently expected to FAIL because
 * the configuration is missing.
 *
 * Issue: workers-7ulw
 * Expected configuration:
 *   [observability]
 *   enabled = true
 */
describe('wrangler.toml observability configuration', () => {
    let wranglerConfig;
    beforeAll(() => {
        // Read wrangler.toml from project root
        const wranglerPath = resolve(__dirname, '../../../wrangler.toml');
        wranglerConfig = readFileSync(wranglerPath, 'utf-8');
    });
    describe('observability section', () => {
        it('should have [observability] section defined', () => {
            // This test verifies the observability section exists in wrangler.toml
            // Expected to FAIL in RED phase - section is missing
            expect(wranglerConfig).toContain('[observability]');
        });
        it('should have observability.enabled set to true', () => {
            // This test verifies observability is enabled for production
            // Expected to FAIL in RED phase - setting is missing
            //
            // The enabled = true setting enables:
            // - Automatic logging to Cloudflare dashboard
            // - Request tracing
            // - Performance metrics collection
            // Parse the config to check the value
            const hasObservabilitySection = wranglerConfig.includes('[observability]');
            if (!hasObservabilitySection) {
                // Fail fast with clear message if section is missing
                expect.fail('wrangler.toml is missing [observability] section. ' +
                    'Add the following to enable observability:\n\n' +
                    '[observability]\n' +
                    'enabled = true');
            }
            // Check that enabled = true is present after [observability] section
            const observabilitySectionMatch = wranglerConfig.match(/\[observability\][\s\S]*?(?=\[|$)/);
            const observabilitySection = observabilitySectionMatch?.[0] ?? '';
            expect(observabilitySection).toMatch(/enabled\s*=\s*true/);
        });
    });
    describe('production readiness requirements', () => {
        it('should enable automatic logging for Cloudflare dashboard', () => {
            // Observability must be enabled for logs to appear in Cloudflare dashboard
            // This is a production requirement for debugging and monitoring
            expect(wranglerConfig).toMatch(/\[observability\][\s\S]*enabled\s*=\s*true/);
        });
        it('should enable request tracing', () => {
            // Request tracing is automatically enabled when observability.enabled = true
            // This allows tracing requests through the worker for debugging
            expect(wranglerConfig).toMatch(/\[observability\][\s\S]*enabled\s*=\s*true/);
        });
        it('should enable performance metrics collection', () => {
            // Performance metrics are automatically collected when observability.enabled = true
            // This allows monitoring worker performance in the Cloudflare dashboard
            expect(wranglerConfig).toMatch(/\[observability\][\s\S]*enabled\s*=\s*true/);
        });
    });
});
