import { describe, it, expect } from 'vitest';
import { detectPrototypePollution, hasPrototypePollutionKey, safeDeepMerge, safeDeepClone, safeJsonParse, freezePrototypes, PrototypePollutionError, } from '../src/prototype-pollution.js';
describe('Prototype Pollution Prevention', () => {
    describe('detectPrototypePollution', () => {
        describe('should detect dangerous __proto__ keys', () => {
            it('detects __proto__ at top level', () => {
                const obj = { '__proto__': { isAdmin: true } };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
                expect(result.dangerousKeys).toContain('__proto__');
            });
            it('detects __proto__ in nested objects', () => {
                const obj = { user: { profile: { '__proto__': { polluted: true } } } };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
                expect(result.paths).toContain('user.profile.__proto__');
            });
            it('detects __proto__ in arrays', () => {
                const obj = { items: [{ '__proto__': { malicious: true } }] };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
            });
        });
        describe('should detect constructor.prototype modifications', () => {
            it('detects constructor key', () => {
                const obj = { 'constructor': { prototype: { isAdmin: true } } };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
                expect(result.dangerousKeys).toContain('constructor');
            });
            it('detects nested constructor.prototype', () => {
                const obj = { data: { 'constructor': { 'prototype': { polluted: true } } } };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
                expect(result.paths).toContain('data.constructor.prototype');
            });
            it('detects prototype key directly', () => {
                const obj = { 'prototype': { isAdmin: true } };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(true);
                expect(result.dangerousKeys).toContain('prototype');
            });
        });
        describe('should allow safe objects', () => {
            it('allows normal objects', () => {
                const obj = { name: 'John', age: 30, active: true };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(false);
                expect(result.dangerousKeys).toHaveLength(0);
            });
            it('allows deeply nested safe objects', () => {
                const obj = {
                    user: {
                        profile: {
                            settings: {
                                theme: 'dark',
                                notifications: true,
                            },
                        },
                    },
                };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(false);
            });
            it('allows arrays with safe objects', () => {
                const obj = { items: [{ id: 1 }, { id: 2 }] };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(false);
            });
            it('allows empty objects', () => {
                const result = detectPrototypePollution({});
                expect(result.isPolluted).toBe(false);
            });
        });
        describe('edge cases', () => {
            it('handles null values', () => {
                const obj = { value: null };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(false);
            });
            it('handles undefined values', () => {
                const obj = { value: undefined };
                const result = detectPrototypePollution(obj);
                expect(result.isPolluted).toBe(false);
            });
            it('handles circular references gracefully', () => {
                const obj = { name: 'test' };
                obj.self = obj;
                expect(() => detectPrototypePollution(obj)).not.toThrow();
            });
        });
    });
    describe('hasPrototypePollutionKey', () => {
        it('returns true for __proto__', () => {
            expect(hasPrototypePollutionKey('__proto__')).toBe(true);
        });
        it('returns true for constructor', () => {
            expect(hasPrototypePollutionKey('constructor')).toBe(true);
        });
        it('returns true for prototype', () => {
            expect(hasPrototypePollutionKey('prototype')).toBe(true);
        });
        it('returns false for safe keys', () => {
            expect(hasPrototypePollutionKey('name')).toBe(false);
            expect(hasPrototypePollutionKey('value')).toBe(false);
            expect(hasPrototypePollutionKey('data')).toBe(false);
        });
        it('is case-sensitive', () => {
            expect(hasPrototypePollutionKey('__PROTO__')).toBe(false);
            expect(hasPrototypePollutionKey('Constructor')).toBe(false);
        });
    });
    describe('safeDeepMerge', () => {
        it('merges objects without prototype pollution', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            const result = safeDeepMerge(target, source);
            expect(result).toEqual({ a: 1, b: 2 });
        });
        it('filters out __proto__ keys during merge', () => {
            const target = { a: 1 };
            const source = JSON.parse('{"b": 2, "__proto__": {"polluted": true}}');
            const result = safeDeepMerge(target, source);
            expect(result).toEqual({ a: 1, b: 2 });
            expect(result['__proto__']).toBeUndefined();
            expect({}['polluted']).toBeUndefined();
        });
        it('filters out constructor keys during merge', () => {
            const target = { a: 1 };
            const source = { b: 2, constructor: { prototype: { isAdmin: true } } };
            const result = safeDeepMerge(target, source);
            expect(result['constructor']).toBeUndefined();
        });
        it('handles nested merges safely', () => {
            const target = { user: { name: 'John' } };
            const source = JSON.parse('{"user": {"__proto__": {"admin": true}, "age": 30}}');
            const result = safeDeepMerge(target, source);
            expect(result.user.age).toBe(30);
            expect({}['admin']).toBeUndefined();
        });
        it('uses null prototype to prevent inherited pollution', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            const result = safeDeepMerge(target, source);
            // Null prototype ensures no inherited constructor/prototype properties
            expect(Object.getPrototypeOf(result)).toBe(null);
        });
        it('handles arrays correctly', () => {
            const target = { items: [1, 2] };
            const source = { items: [3, 4] };
            const result = safeDeepMerge(target, source);
            expect(result.items).toEqual([3, 4]);
        });
    });
    describe('safeDeepClone', () => {
        it('clones objects without prototype pollution', () => {
            const original = { a: 1, b: { c: 2 } };
            const clone = safeDeepClone(original);
            expect(clone).toEqual(original);
            expect(clone).not.toBe(original);
        });
        it('strips __proto__ keys during clone', () => {
            const original = JSON.parse('{"a": 1, "__proto__": {"polluted": true}}');
            const clone = safeDeepClone(original);
            expect(clone).toEqual({ a: 1 });
            expect({}['polluted']).toBeUndefined();
        });
        it('strips constructor keys during clone', () => {
            const original = { a: 1, constructor: { prototype: { isAdmin: true } } };
            const clone = safeDeepClone(original);
            expect(clone['constructor']).toBeUndefined();
        });
        it('handles nested objects', () => {
            const original = {
                level1: {
                    level2: {
                        value: 'deep',
                    },
                },
            };
            const clone = safeDeepClone(original);
            expect(clone.level1.level2.value).toBe('deep');
            expect(clone.level1).not.toBe(original.level1);
        });
        it('handles arrays', () => {
            const original = { items: [1, 2, { nested: true }] };
            const clone = safeDeepClone(original);
            expect(clone).toEqual(original);
            expect(clone.items).not.toBe(original.items);
        });
        it('handles null and primitives', () => {
            expect(safeDeepClone(null)).toBeNull();
            expect(safeDeepClone(42)).toBe(42);
            expect(safeDeepClone('string')).toBe('string');
        });
    });
    describe('safeJsonParse', () => {
        it('parses JSON without prototype pollution', () => {
            const json = '{"name": "John", "age": 30}';
            const result = safeJsonParse(json);
            expect(result).toEqual({ name: 'John', age: 30 });
        });
        it('strips __proto__ from parsed JSON', () => {
            const json = '{"name": "John", "__proto__": {"isAdmin": true}}';
            const result = safeJsonParse(json);
            expect(result).toEqual({ name: 'John' });
            expect({}['isAdmin']).toBeUndefined();
        });
        it('strips constructor from parsed JSON', () => {
            const json = '{"name": "John", "constructor": {"prototype": {"polluted": true}}}';
            const result = safeJsonParse(json);
            expect(result['constructor']).toBeUndefined();
        });
        it('handles nested polluted objects', () => {
            const json = '{"user": {"profile": {"__proto__": {"admin": true}}, "name": "John"}}';
            const result = safeJsonParse(json);
            expect(result.user.name).toBe('John');
            expect({}['admin']).toBeUndefined();
        });
        it('throws on invalid JSON', () => {
            expect(() => safeJsonParse('not valid json')).toThrow(SyntaxError);
        });
        it('handles arrays in JSON', () => {
            const json = '[{"id": 1}, {"id": 2, "__proto__": {"bad": true}}]';
            const result = safeJsonParse(json);
            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
        });
        it('returns null for null input', () => {
            const result = safeJsonParse('null');
            expect(result).toBeNull();
        });
    });
    describe('freezePrototypes', () => {
        it('freezes Object.prototype', () => {
            freezePrototypes();
            expect(Object.isFrozen(Object.prototype)).toBe(true);
        });
        it('prevents modifications to Object.prototype after freezing', () => {
            freezePrototypes();
            expect(() => {
                ;
                Object.prototype['newProp'] = 'value';
            }).toThrow();
        });
        it('freezes Array.prototype', () => {
            freezePrototypes();
            expect(Object.isFrozen(Array.prototype)).toBe(true);
        });
        it('freezes Function.prototype', () => {
            freezePrototypes();
            expect(Object.isFrozen(Function.prototype)).toBe(true);
        });
    });
    describe('PrototypePollutionError', () => {
        it('should be throwable with detection result', () => {
            const result = {
                isPolluted: true,
                dangerousKeys: ['__proto__', 'constructor'],
                paths: ['data.__proto__', 'user.constructor'],
                input: { data: { '__proto__': {} } },
            };
            const error = new PrototypePollutionError('Prototype pollution detected', result);
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('PrototypePollutionError');
            expect(error.result.dangerousKeys).toContain('__proto__');
        });
        it('includes meaningful error message', () => {
            const result = {
                isPolluted: true,
                dangerousKeys: ['__proto__'],
                paths: ['data.__proto__'],
                input: {},
            };
            const error = new PrototypePollutionError('Prototype pollution attempt blocked', result);
            expect(error.message).toBe('Prototype pollution attempt blocked');
        });
    });
});
