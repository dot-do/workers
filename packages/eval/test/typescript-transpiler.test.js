/**
 * RED Phase TDD: TypeScript Transpiler Workers Compatibility Tests
 *
 * These tests define the contract for a Workers-compatible TypeScript transpiler.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Key requirement: Must transpile TypeScript to JavaScript before execution.
 * Workers environment requires type stripping for TypeScript compatibility.
 *
 * The transpiler contract includes:
 * - transpile() - Convert TypeScript to JavaScript
 * - Type stripping for interfaces, type aliases, etc.
 * - Support for TypeScript-specific syntax (enums, namespaces, etc.)
 * - Error handling for invalid TypeScript
 * - Integration with CodeExecutor for TypeScript execution
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTypeScriptTranspiler, createExecutor, } from '../src/index.js';
describe('TypeScriptTranspiler - Workers Compatibility', () => {
    describe('createTypeScriptTranspiler() factory', () => {
        it('should create a transpiler instance', () => {
            const transpiler = createTypeScriptTranspiler();
            expect(transpiler).toBeDefined();
            expect(typeof transpiler.transpile).toBe('function');
            expect(typeof transpiler.dispose).toBe('function');
        });
        it('should accept configuration options', () => {
            const transpiler = createTypeScriptTranspiler({
                target: 'ES2022',
                strict: true,
            });
            expect(transpiler).toBeDefined();
        });
        it('should work in Workers environment without Node.js APIs', () => {
            // The transpiler should not depend on Node.js specific modules
            const transpiler = createTypeScriptTranspiler();
            expect(transpiler).toBeDefined();
            // Should not use fs, path, or other Node.js modules
        });
    });
    describe('transpile() - Basic Type Stripping', () => {
        let transpiler;
        beforeEach(() => {
            transpiler = createTypeScriptTranspiler();
        });
        afterEach(() => {
            transpiler?.dispose();
        });
        it('should strip type annotations from variables', () => {
            const result = transpiler.transpile('const x: number = 42');
            expect(result.success).toBe(true);
            expect(result.code).toBeDefined();
            expect(result.code).not.toContain(': number');
            expect(result.code).toContain('const x');
            expect(result.code).toContain('42');
        });
        it('should strip type annotations from function parameters', () => {
            const result = transpiler.transpile('function add(a: number, b: number): number { return a + b }');
            expect(result.success).toBe(true);
            expect(result.code).not.toContain(': number');
            expect(result.code).toContain('function add');
            expect(result.code).toContain('return a + b');
        });
        it('should strip type annotations from arrow functions', () => {
            const result = transpiler.transpile('const double = (x: number): number => x * 2');
            expect(result.success).toBe(true);
            expect(result.code).not.toContain(': number');
            expect(result.code).toContain('double');
            expect(result.code).toContain('x * 2');
        });
        it('should strip generic type parameters', () => {
            const result = transpiler.transpile('function identity<T>(value: T): T { return value }');
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('<T>');
            expect(result.code).not.toContain(': T');
            expect(result.code).toContain('function identity');
        });
        it('should strip type assertions', () => {
            const result = transpiler.transpile('const x = value as string');
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('as string');
            expect(result.code).toContain('const x');
        });
        it('should strip angle-bracket type assertions', () => {
            const result = transpiler.transpile('const x = <string>value');
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('<string>');
            expect(result.code).toContain('const x');
        });
    });
    describe('transpile() - Interface and Type Removal', () => {
        let transpiler;
        beforeEach(() => {
            transpiler = createTypeScriptTranspiler();
        });
        afterEach(() => {
            transpiler?.dispose();
        });
        it('should remove interface declarations', () => {
            const result = transpiler.transpile(`
        interface User {
          name: string
          age: number
        }
        const user: User = { name: 'test', age: 25 }
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('interface User');
            expect(result.code).not.toContain(': User');
            expect(result.code).toContain("name: 'test'");
        });
        it('should remove type alias declarations', () => {
            const result = transpiler.transpile(`
        type ID = string | number
        const id: ID = 'abc123'
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('type ID');
            expect(result.code).not.toContain(': ID');
            expect(result.code).toContain("'abc123'");
        });
        it('should remove exported interface declarations', () => {
            const result = transpiler.transpile(`
        export interface Config {
          timeout: number
          retries: number
        }
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('interface Config');
        });
        it('should remove exported type alias declarations', () => {
            const result = transpiler.transpile(`
        export type Status = 'pending' | 'active' | 'done'
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('type Status');
        });
        it('should handle complex nested types', () => {
            const result = transpiler.transpile(`
        interface Nested {
          data: {
            items: Array<{ id: number; value: string }>
          }
        }
        const obj: Nested = { data: { items: [] } }
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('interface Nested');
            expect(result.code).toContain('items: []');
        });
    });
    describe('transpile() - TypeScript-Specific Syntax', () => {
        let transpiler;
        beforeEach(() => {
            transpiler = createTypeScriptTranspiler();
        });
        afterEach(() => {
            transpiler?.dispose();
        });
        it('should transpile const enums to inline values', () => {
            const result = transpiler.transpile(`
        const enum Direction {
          Up = 0,
          Down = 1,
          Left = 2,
          Right = 3
        }
        const dir = Direction.Up
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('const enum');
            // Const enums should be inlined
            expect(result.code).toContain('0');
        });
        it('should transpile regular enums', () => {
            const result = transpiler.transpile(`
        enum Status {
          Pending,
          Active,
          Done
        }
        const s = Status.Active
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain(': Status');
        });
        it('should handle optional chaining with non-null assertion', () => {
            const result = transpiler.transpile(`
        const value = obj?.prop!.nested
      `);
            expect(result.success).toBe(true);
            // Non-null assertion should be stripped
            expect(result.code).not.toMatch(/!\./g);
        });
        it('should strip readonly modifiers', () => {
            const result = transpiler.transpile(`
        interface Config {
          readonly timeout: number
        }
        const arr: readonly number[] = [1, 2, 3]
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('readonly');
        });
        it('should handle access modifiers in classes', () => {
            const result = transpiler.transpile(`
        class User {
          private name: string
          public age: number
          protected id: string

          constructor(name: string) {
            this.name = name
          }
        }
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('private');
            expect(result.code).not.toContain('public');
            expect(result.code).not.toContain('protected');
            expect(result.code).toContain('class User');
        });
        it('should handle parameter properties', () => {
            const result = transpiler.transpile(`
        class Point {
          constructor(public x: number, private y: number) {}
        }
      `);
            expect(result.success).toBe(true);
            expect(result.code).toContain('class Point');
            // Parameter properties should be transformed to assignments
        });
        it('should handle abstract classes', () => {
            const result = transpiler.transpile(`
        abstract class Shape {
          abstract getArea(): number
        }
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('abstract');
        });
        it('should handle decorators with experimentalDecorators', () => {
            const transpiler = createTypeScriptTranspiler({
                experimentalDecorators: true,
            });
            const result = transpiler.transpile(`
        function log(target: any) {}

        @log
        class MyClass {}
      `);
            expect(result.success).toBe(true);
            transpiler.dispose();
        });
        it('should handle namespace declarations', () => {
            const result = transpiler.transpile(`
        namespace Utils {
          export function helper() { return 42 }
        }
      `);
            expect(result.success).toBe(true);
            // Namespace should be transformed to IIFE or module pattern
        });
    });
    describe('transpile() - Error Handling', () => {
        let transpiler;
        beforeEach(() => {
            transpiler = createTypeScriptTranspiler();
        });
        afterEach(() => {
            transpiler?.dispose();
        });
        it('should report syntax errors', () => {
            const result = transpiler.transpile('const x: number = {{{');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.code).toBeUndefined();
        });
        it('should report unterminated string literals', () => {
            const result = transpiler.transpile('const x: string = "unterminated');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should report invalid type syntax', () => {
            const result = transpiler.transpile('const x: = 5');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should include error location', () => {
            const result = transpiler.transpile(`
        const valid = 1
        const invalid: = 2
        const alsoValid = 3
      `);
            expect(result.success).toBe(false);
            expect(result.location).toBeDefined();
            expect(result.location?.line).toBeGreaterThan(0);
        });
        it('should handle multiple errors gracefully', () => {
            const result = transpiler.transpile(`
        const a: = 1
        const b: = 2
      `);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should report invalid decorator usage', () => {
            const result = transpiler.transpile(`
        @decorator
        const x = 5
      `);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe('transpile() - Options', () => {
        it('should respect target option for output syntax', () => {
            const transpiler = createTypeScriptTranspiler({ target: 'ES5' });
            const result = transpiler.transpile(`
        const arrow = (x: number) => x * 2
      `);
            expect(result.success).toBe(true);
            // ES5 should convert arrow functions
            transpiler.dispose();
        });
        it('should respect module option', () => {
            const transpiler = createTypeScriptTranspiler({ module: 'ESNext' });
            const result = transpiler.transpile(`
        export const value: number = 42
      `);
            expect(result.success).toBe(true);
            expect(result.code).toContain('export');
            transpiler.dispose();
        });
        it('should handle JSX when configured', () => {
            const transpiler = createTypeScriptTranspiler({ jsx: 'react' });
            const result = transpiler.transpile(`
        const element: JSX.Element = <div className="test">Hello</div>
      `);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('<div');
            expect(result.code).toContain('React.createElement');
            transpiler.dispose();
        });
        it('should handle JSX preserve mode', () => {
            const transpiler = createTypeScriptTranspiler({ jsx: 'preserve' });
            const result = transpiler.transpile(`
        const element: JSX.Element = <div>Hello</div>
      `);
            expect(result.success).toBe(true);
            expect(result.code).toContain('<div>');
            transpiler.dispose();
        });
        it('should support sourceMap option', () => {
            const transpiler = createTypeScriptTranspiler({ sourceMap: true });
            const result = transpiler.transpile('const x: number = 42');
            expect(result.success).toBe(true);
            expect(result.sourceMap).toBeDefined();
            transpiler.dispose();
        });
    });
    describe('Integration with CodeExecutor', () => {
        let transpiler;
        let executor;
        beforeEach(() => {
            transpiler = createTypeScriptTranspiler();
            executor = createExecutor();
        });
        afterEach(() => {
            transpiler?.dispose();
            executor?.dispose();
        });
        it('should execute transpiled TypeScript code', async () => {
            const tsCode = `
        const add = (a: number, b: number): number => a + b
        return add(2, 3)
      `;
            const transpileResult = transpiler.transpile(tsCode);
            expect(transpileResult.success).toBe(true);
            const execResult = await executor.execute(transpileResult.code);
            expect(execResult.success).toBe(true);
            expect(execResult.value).toBe(5);
        });
        it('should execute transpiled code with interfaces', async () => {
            const tsCode = `
        interface Point {
          x: number
          y: number
        }

        const point: Point = { x: 10, y: 20 }
        return point.x + point.y
      `;
            const transpileResult = transpiler.transpile(tsCode);
            expect(transpileResult.success).toBe(true);
            const execResult = await executor.execute(transpileResult.code);
            expect(execResult.success).toBe(true);
            expect(execResult.value).toBe(30);
        });
        it('should execute transpiled code with generics', async () => {
            const tsCode = `
        function identity<T>(value: T): T {
          return value
        }

        return identity<number>(42)
      `;
            const transpileResult = transpiler.transpile(tsCode);
            expect(transpileResult.success).toBe(true);
            const execResult = await executor.execute(transpileResult.code);
            expect(execResult.success).toBe(true);
            expect(execResult.value).toBe(42);
        });
        it('should execute transpiled async TypeScript code', async () => {
            const tsCode = `
        async function fetchData(): Promise<{ data: string }> {
          return { data: 'typescript' }
        }

        return await fetchData()
      `;
            const transpileResult = transpiler.transpile(tsCode);
            expect(transpileResult.success).toBe(true);
            const execResult = await executor.execute(transpileResult.code, {
                allowAsync: true,
            });
            expect(execResult.success).toBe(true);
            expect(execResult.value).toEqual({ data: 'typescript' });
        });
        it('should execute transpiled code with class definitions', async () => {
            const tsCode = `
        class Counter {
          private count: number = 0

          increment(): number {
            return ++this.count
          }
        }

        const counter = new Counter()
        counter.increment()
        counter.increment()
        return counter.increment()
      `;
            const transpileResult = transpiler.transpile(tsCode);
            expect(transpileResult.success).toBe(true);
            const execResult = await executor.execute(transpileResult.code);
            expect(execResult.success).toBe(true);
            expect(execResult.value).toBe(3);
        });
    });
    describe('dispose() - Resource Cleanup', () => {
        it('should clean up resources', () => {
            const transpiler = createTypeScriptTranspiler();
            expect(() => transpiler.dispose()).not.toThrow();
        });
        it('should throw after disposal', () => {
            const transpiler = createTypeScriptTranspiler();
            transpiler.dispose();
            expect(() => transpiler.transpile('const x: number = 1')).toThrow();
        });
        it('should be idempotent', () => {
            const transpiler = createTypeScriptTranspiler();
            expect(() => {
                transpiler.dispose();
                transpiler.dispose();
                transpiler.dispose();
            }).not.toThrow();
        });
    });
    describe('Workers Environment Compatibility', () => {
        it('should not require file system access', () => {
            const transpiler = createTypeScriptTranspiler();
            // Should work with in-memory code only
            const result = transpiler.transpile('const x: number = 42');
            expect(result.success).toBe(true);
            transpiler.dispose();
        });
        it('should handle large TypeScript files', () => {
            const transpiler = createTypeScriptTranspiler();
            // Generate a large TypeScript file
            const interfaces = Array.from({ length: 100 }, (_, i) => `interface Type${i} { field: number }`).join('\n');
            const result = transpiler.transpile(interfaces);
            expect(result.success).toBe(true);
            expect(result.code).not.toContain('interface');
            transpiler.dispose();
        });
        it('should be fast enough for real-time use', () => {
            const transpiler = createTypeScriptTranspiler();
            const start = Date.now();
            for (let i = 0; i < 10; i++) {
                transpiler.transpile(`
          interface User { name: string; age: number }
          const user: User = { name: 'test', age: 25 }
        `);
            }
            const duration = Date.now() - start;
            // Should complete 10 transpilations in under 1 second
            expect(duration).toBeLessThan(1000);
            transpiler.dispose();
        });
    });
});
