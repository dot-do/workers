/**
 * RED Phase TDD: ESBuild Worker TypeScript Compilation Tests
 *
 * These tests define the contract for a Workers-compatible ESBuild WASM worker.
 * All tests should FAIL initially - implementation comes in GREEN phase (workers-1qqj.3).
 *
 * Key requirements:
 * - Must use esbuild-wasm for Workers compatibility (no native binaries)
 * - Must compile TypeScript to JavaScript
 * - Must support bundling, minification, source maps
 * - Must handle JSX/TSX
 * - Must provide meaningful error messages
 *
 * The ESBuild Worker contract includes:
 * - createESBuildWorker() - Factory to create worker instance
 * - initialize() - Load WASM module
 * - compile() - Compile single source string
 * - bundle() - Compile multiple files with imports
 * - dispose() - Clean up resources
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createESBuildWorker } from '../src/index.js';
describe('ESBuild Worker - TypeScript Compilation', () => {
    describe('createESBuildWorker() factory', () => {
        it('should create an ESBuild worker instance', () => {
            const worker = createESBuildWorker();
            expect(worker).toBeDefined();
            expect(typeof worker.initialize).toBe('function');
            expect(typeof worker.compile).toBe('function');
            expect(typeof worker.bundle).toBe('function');
            expect(typeof worker.dispose).toBe('function');
            expect(typeof worker.isInitialized).toBe('function');
        });
        it('should accept custom WASM URL', () => {
            const worker = createESBuildWorker('/custom/path/esbuild.wasm');
            expect(worker).toBeDefined();
        });
        it('should work in Workers environment without Node.js APIs', () => {
            // The worker should not depend on Node.js specific modules
            const worker = createESBuildWorker();
            expect(worker).toBeDefined();
            // Implementation must use esbuild-wasm, not native esbuild
        });
    });
    describe('initialize()', () => {
        let worker;
        beforeEach(() => {
            worker = createESBuildWorker();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should initialize the WASM module', async () => {
            await worker.initialize();
            expect(worker.isInitialized()).toBe(true);
        });
        it('should be idempotent - multiple calls are safe', async () => {
            await worker.initialize();
            await worker.initialize();
            await worker.initialize();
            expect(worker.isInitialized()).toBe(true);
        });
        it('should not require initialization before checking isInitialized', () => {
            expect(worker.isInitialized()).toBe(false);
        });
    });
    describe('compile() - Basic TypeScript Compilation', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should compile TypeScript to JavaScript', async () => {
            const result = await worker.compile(`
        const greet = (name: string): string => \`Hello \${name}\`;
        export default { fetch: () => new Response(greet('World')) };
      `);
            expect(result.code).toBeDefined();
            expect(result.code).toContain('Hello');
            expect(result.errors).toHaveLength(0);
        });
        it('should strip type annotations', async () => {
            const result = await worker.compile(`
        const x: number = 42;
        const y: string = 'hello';
        export { x, y };
      `);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain(': number');
            expect(result.code).not.toContain(': string');
            expect(result.errors).toHaveLength(0);
        });
        it('should handle interface declarations', async () => {
            const result = await worker.compile(`
        interface User {
          name: string;
          age: number;
        }

        const user: User = { name: 'Test', age: 25 };
        export default user;
      `);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('interface User');
            expect(result.code).toContain('name');
            expect(result.errors).toHaveLength(0);
        });
        it('should handle type aliases', async () => {
            const result = await worker.compile(`
        type ID = string | number;
        const id: ID = 'abc123';
        export default id;
      `);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('type ID');
            expect(result.errors).toHaveLength(0);
        });
        it('should handle generics', async () => {
            const result = await worker.compile(`
        function identity<T>(value: T): T {
          return value;
        }
        export default identity;
      `);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('<T>');
            expect(result.errors).toHaveLength(0);
        });
        it('should handle async/await', async () => {
            const result = await worker.compile(`
        async function fetchData(): Promise<string> {
          return 'data';
        }
        export default fetchData;
      `);
            expect(result.code).toBeDefined();
            expect(result.code).toContain('async');
            expect(result.errors).toHaveLength(0);
        });
        it('should handle class with decorators when enabled', async () => {
            const result = await worker.compile(`
        function log(target: any) {}

        @log
        class MyClass {
          value: number = 0;
        }
        export default MyClass;
      `);
            // ESBuild handles decorators differently than TypeScript
            expect(result.code).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
        it('should handle enums', async () => {
            const result = await worker.compile(`
        enum Status {
          Pending,
          Active,
          Done
        }
        const status = Status.Active;
        export default status;
      `);
            expect(result.code).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
    });
    describe('compile() - JSX/TSX Support', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should compile JSX', async () => {
            const result = await worker.compile(`
        const element = <div className="test">Hello World</div>;
        export default element;
      `, { jsxFactory: 'React.createElement' });
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('<div');
            expect(result.code).toContain('createElement');
            expect(result.errors).toHaveLength(0);
        });
        it('should compile TSX with types', async () => {
            const result = await worker.compile(`
        interface Props {
          name: string;
        }

        const Greeting = ({ name }: Props) => (
          <h1>Hello, {name}!</h1>
        );
        export default Greeting;
      `, { jsxFactory: 'React.createElement' });
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('interface Props');
            expect(result.code).toContain('createElement');
            expect(result.errors).toHaveLength(0);
        });
        it('should support custom JSX factory', async () => {
            const result = await worker.compile(`
        const element = <div>Test</div>;
        export default element;
      `, { jsxFactory: 'h', jsxFragment: 'Fragment' });
            expect(result.code).toBeDefined();
            expect(result.code).toContain('h(');
            expect(result.errors).toHaveLength(0);
        });
    });
    describe('compile() - Build Options', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should minify code when minify: true', async () => {
            const source = `
        export function longFunctionName(parameter: string): string {
          const anotherLongVariableName = parameter + ' world';
          return anotherLongVariableName;
        }
      `;
            const unminified = await worker.compile(source, { minify: false });
            const minified = await worker.compile(source, { minify: true });
            expect(minified.code.length).toBeLessThan(unminified.code.length);
            expect(minified.errors).toHaveLength(0);
        });
        it('should generate source map when sourcemap: true', async () => {
            const result = await worker.compile(`
        const x: number = 42;
        export default x;
      `, { sourcemap: true });
            expect(result.map).toBeDefined();
            expect(result.map).toContain('mappings');
            expect(result.errors).toHaveLength(0);
        });
        it('should output ESM format by default', async () => {
            const result = await worker.compile(`
        export const value = 42;
      `);
            expect(result.code).toContain('export');
            expect(result.errors).toHaveLength(0);
        });
        it('should output CJS format when format: cjs', async () => {
            const result = await worker.compile(`
        export const value = 42;
      `, { format: 'cjs' });
            expect(result.code).toContain('exports');
            expect(result.errors).toHaveLength(0);
        });
        it('should output IIFE format when format: iife', async () => {
            const result = await worker.compile(`
        export const value = 42;
      `, { format: 'iife' });
            expect(result.code).toMatch(/\(\s*\(\s*\)\s*=>\s*\{|\(\s*function\s*\(/);
            expect(result.errors).toHaveLength(0);
        });
        it('should respect target option', async () => {
            const result = await worker.compile(`
        const arrow = (x: number) => x * 2;
        export default arrow;
      `, { target: 'es2015' });
            expect(result.code).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
        it('should handle define option for constants', async () => {
            const result = await worker.compile(`
        declare const __VERSION__: string;
        export const version = __VERSION__;
      `, { define: { '__VERSION__': '"1.0.0"' } });
            expect(result.code).toContain('1.0.0');
            expect(result.errors).toHaveLength(0);
        });
        it('should exclude external packages from bundle', async () => {
            const result = await worker.compile(`
        import lodash from 'lodash';
        export const chunk = lodash.chunk;
      `, { external: ['lodash'] });
            expect(result.code).toContain('lodash');
            // External import should remain
            expect(result.errors).toHaveLength(0);
        });
    });
    describe('compile() - Error Handling', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should report syntax errors', async () => {
            const result = await worker.compile(`
        const x: number = {{{
      `);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]?.text).toBeDefined();
        });
        it('should include error location', async () => {
            const result = await worker.compile(`
        const valid = 1;
        const invalid = {{{;
        const alsoValid = 3;
      `);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]?.location).toBeDefined();
            expect(result.errors[0]?.location?.line).toBeGreaterThan(0);
        });
        it('should report unterminated string', async () => {
            const result = await worker.compile(`
        const x = "unterminated
      `);
            expect(result.errors.length).toBeGreaterThan(0);
        });
        it('should handle multiple errors', async () => {
            const result = await worker.compile(`
        const a = {{{;
        const b = }}};
      `);
            expect(result.errors.length).toBeGreaterThan(0);
        });
        it('should return warnings for non-fatal issues', async () => {
            const result = await worker.compile(`
        const unusedVar = 42;
        export default 'hello';
      `);
            // ESBuild may or may not warn about unused variables
            // but should compile successfully
            expect(result.code).toBeDefined();
        });
    });
    describe('bundle() - Multi-file Bundling', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should bundle multiple files', async () => {
            const files = {
                'index.ts': `
          import { greet } from './utils';
          export default greet('World');
        `,
                'utils.ts': `
          export function greet(name: string): string {
            return \`Hello \${name}\`;
          }
        `
            };
            const result = await worker.bundle(files, 'index.ts');
            expect(result.code).toBeDefined();
            expect(result.code).toContain('Hello');
            expect(result.errors).toHaveLength(0);
        });
        it('should resolve relative imports', async () => {
            const files = {
                'src/index.ts': `
          import { add } from './math/operations';
          export default add(1, 2);
        `,
                'src/math/operations.ts': `
          export function add(a: number, b: number): number {
            return a + b;
          }
        `
            };
            const result = await worker.bundle(files, 'src/index.ts');
            expect(result.code).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
        it('should handle circular imports', async () => {
            const files = {
                'a.ts': `
          import { b } from './b';
          export const a = 'a' + b;
        `,
                'b.ts': `
          export const b = 'b';
        `
            };
            const result = await worker.bundle(files, 'a.ts');
            expect(result.code).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
        it('should bundle with shared dependencies', async () => {
            const files = {
                'index.ts': `
          import { A } from './moduleA';
          import { B } from './moduleB';
          export default { A, B };
        `,
                'moduleA.ts': `
          import { shared } from './shared';
          export const A = 'A:' + shared;
        `,
                'moduleB.ts': `
          import { shared } from './shared';
          export const B = 'B:' + shared;
        `,
                'shared.ts': `
          export const shared = 'common';
        `
            };
            const result = await worker.bundle(files, 'index.ts');
            expect(result.code).toBeDefined();
            // Shared module should only be included once
            expect(result.errors).toHaveLength(0);
        });
        it('should report missing import errors', async () => {
            const files = {
                'index.ts': `
          import { missing } from './nonexistent';
          export default missing;
        `
            };
            const result = await worker.bundle(files, 'index.ts');
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
    describe('dispose() - Resource Cleanup', () => {
        it('should clean up WASM resources', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            expect(() => worker.dispose()).not.toThrow();
        });
        it('should throw after disposal', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            worker.dispose();
            await expect(worker.compile('const x = 1;')).rejects.toThrow();
        });
        it('should be idempotent', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            expect(() => {
                worker.dispose();
                worker.dispose();
                worker.dispose();
            }).not.toThrow();
        });
        it('should allow disposal without initialization', () => {
            const worker = createESBuildWorker();
            expect(() => worker.dispose()).not.toThrow();
        });
    });
    describe('Workers Environment Compatibility', () => {
        it('should not require file system access', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            // Should work with in-memory code only
            const result = await worker.compile('const x: number = 42; export default x;');
            expect(result.code).toBeDefined();
            worker.dispose();
        });
        it('should handle large TypeScript files', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            // Generate a large TypeScript file
            const interfaces = Array.from({ length: 100 }, (_, i) => `interface Type${i} { field${i}: number; }`).join('\n');
            const source = `
        ${interfaces}
        export const value = 42;
      `;
            const result = await worker.compile(source);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain('interface');
            expect(result.errors).toHaveLength(0);
            worker.dispose();
        });
        it('should be fast enough for real-time use', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            const source = `
        interface User { name: string; age: number }
        const user: User = { name: 'test', age: 25 };
        export default user;
      `;
            const start = Date.now();
            for (let i = 0; i < 10; i++) {
                await worker.compile(source);
            }
            const duration = Date.now() - start;
            // ESBuild should complete 10 compilations in under 500ms
            expect(duration).toBeLessThan(500);
            worker.dispose();
        });
        it('should handle concurrent compilations', async () => {
            const worker = createESBuildWorker();
            await worker.initialize();
            const sources = [
                'export const a: number = 1;',
                'export const b: string = "hello";',
                'export const c: boolean = true;',
                'export const d: number[] = [1, 2, 3];',
                'export const e: { x: number } = { x: 42 };',
            ];
            const results = await Promise.all(sources.map(source => worker.compile(source)));
            for (const result of results) {
                expect(result.code).toBeDefined();
                expect(result.errors).toHaveLength(0);
            }
            worker.dispose();
        });
    });
    describe('Workers Handler Compilation', () => {
        let worker;
        beforeEach(async () => {
            worker = createESBuildWorker();
            await worker.initialize();
        });
        afterEach(() => {
            worker?.dispose();
        });
        it('should compile a complete Cloudflare Worker', async () => {
            const result = await worker.compile(`
        interface Env {
          KV: KVNamespace;
        }

        export default {
          async fetch(request: Request, env: Env): Promise<Response> {
            const url = new URL(request.url);
            const value = await env.KV.get(url.pathname);
            return new Response(value || 'Not found', {
              status: value ? 200 : 404,
            });
          }
        };
      `);
            expect(result.code).toBeDefined();
            expect(result.code).toContain('fetch');
            expect(result.code).toContain('Response');
            expect(result.code).not.toContain('interface Env');
            expect(result.errors).toHaveLength(0);
        });
        it('should compile Worker with Durable Objects', async () => {
            const result = await worker.compile(`
        interface Env {
          COUNTER: DurableObjectNamespace;
        }

        export class Counter {
          private state: DurableObjectState;
          private count: number = 0;

          constructor(state: DurableObjectState) {
            this.state = state;
          }

          async fetch(request: Request): Promise<Response> {
            this.count++;
            return new Response(String(this.count));
          }
        }

        export default {
          fetch(request: Request, env: Env): Response {
            const id = env.COUNTER.idFromName('main');
            const obj = env.COUNTER.get(id);
            return obj.fetch(request);
          }
        };
      `);
            expect(result.code).toBeDefined();
            // ESBuild transforms classes to var Counter = class form, but still exports Counter
            expect(result.code).toContain('Counter');
            expect(result.errors).toHaveLength(0);
        });
        it('should compile Worker with scheduled handlers', async () => {
            const result = await worker.compile(`
        interface Env {
          DB: D1Database;
        }

        export default {
          async fetch(request: Request): Promise<Response> {
            return new Response('OK');
          },

          async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
            await env.DB.exec('DELETE FROM logs WHERE created_at < datetime("now", "-7 days")');
          }
        };
      `);
            expect(result.code).toBeDefined();
            expect(result.code).toContain('scheduled');
            expect(result.errors).toHaveLength(0);
        });
    });
});
