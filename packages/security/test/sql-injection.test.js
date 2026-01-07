import { describe, it, expect } from 'vitest';
import { detectSqlInjection, SqlInjectionError, sanitizeInput, createParameterizedQuery, escapeString, isValidIdentifier, } from '../src/index.js';
describe('SQL Injection Prevention', () => {
    describe('detectSqlInjection', () => {
        describe('should detect common SQL injection patterns', () => {
            it('detects single quote escape attempts', () => {
                const result = detectSqlInjection("'; DROP TABLE users; --");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('comment');
            });
            it('detects OR 1=1 patterns', () => {
                const result = detectSqlInjection("admin' OR 1=1 --");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('tautology');
            });
            it('detects UNION SELECT attacks', () => {
                const result = detectSqlInjection("1 UNION SELECT * FROM passwords");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('union');
            });
            it('detects stacked queries', () => {
                const result = detectSqlInjection("1; DELETE FROM users");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('stacked');
            });
            it('detects comment injection', () => {
                const result = detectSqlInjection("admin'--");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('comment');
            });
            it('detects hex-encoded attacks', () => {
                const result = detectSqlInjection("0x27204f52203127");
                expect(result.isInjection).toBe(true);
                expect(result.patterns).toContain('hex');
            });
            it('detects case variations', () => {
                const result = detectSqlInjection("1 UnIoN SeLeCt password FROM users");
                expect(result.isInjection).toBe(true);
            });
        });
        describe('should allow safe inputs', () => {
            it('allows normal text', () => {
                const result = detectSqlInjection("John Doe");
                expect(result.isInjection).toBe(false);
                expect(result.patterns).toHaveLength(0);
            });
            it('allows numbers', () => {
                const result = detectSqlInjection("12345");
                expect(result.isInjection).toBe(false);
            });
            it('allows emails', () => {
                const result = detectSqlInjection("user@example.com");
                expect(result.isInjection).toBe(false);
            });
            it('allows sentences with apostrophes', () => {
                const result = detectSqlInjection("It's a nice day");
                expect(result.isInjection).toBe(false);
            });
            it('allows UUIDs', () => {
                const result = detectSqlInjection("550e8400-e29b-41d4-a716-446655440000");
                expect(result.isInjection).toBe(false);
            });
        });
        describe('edge cases', () => {
            it('handles empty string', () => {
                const result = detectSqlInjection("");
                expect(result.isInjection).toBe(false);
            });
            it('handles very long strings', () => {
                const longString = "a".repeat(10000);
                const result = detectSqlInjection(longString);
                expect(result.isInjection).toBe(false);
            });
            it('handles unicode characters', () => {
                const result = detectSqlInjection("Hello world");
                expect(result.isInjection).toBe(false);
            });
        });
    });
    describe('SqlInjectionError', () => {
        it('should be throwable with detection result', () => {
            const result = {
                isInjection: true,
                patterns: ['union', 'comment'],
                input: "1 UNION SELECT --",
            };
            const error = new SqlInjectionError('SQL injection detected', result);
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('SqlInjectionError');
            expect(error.result.patterns).toContain('union');
        });
    });
    describe('sanitizeInput', () => {
        it('removes dangerous characters from input', () => {
            const result = sanitizeInput("hello'; DROP TABLE users;--");
            expect(result).not.toContain("'");
            expect(result).not.toContain(";");
            expect(result).not.toContain("--");
        });
        it('preserves safe alphanumeric content', () => {
            const result = sanitizeInput("HelloWorld123");
            expect(result).toBe("HelloWorld123");
        });
        it('handles allowlist mode', () => {
            const result = sanitizeInput("hello@world.com", { allowlist: /[a-zA-Z0-9@.]/ });
            expect(result).toBe("hello@world.com");
        });
        it('truncates to max length', () => {
            const result = sanitizeInput("a".repeat(1000), { maxLength: 100 });
            expect(result.length).toBe(100);
        });
        it('trims whitespace by default', () => {
            const result = sanitizeInput("  hello  ");
            expect(result).toBe("hello");
        });
    });
    describe('createParameterizedQuery', () => {
        it('creates a query with positional parameters', () => {
            const query = createParameterizedQuery("SELECT * FROM users WHERE id = ? AND status = ?", [1, "active"]);
            expect(query.sql).toBe("SELECT * FROM users WHERE id = ? AND status = ?");
            expect(query.params).toEqual([1, "active"]);
        });
        it('creates a query with named parameters', () => {
            const query = createParameterizedQuery("SELECT * FROM users WHERE id = :id AND status = :status", { id: 1, status: "active" });
            expect(query.sql).toContain("id");
            expect(query.params).toBeDefined();
        });
        it('validates parameter count matches placeholders', () => {
            expect(() => createParameterizedQuery("SELECT * FROM users WHERE id = ? AND name = ?", [1] // Missing second parameter
            )).toThrow('Parameter count mismatch');
        });
        it('escapes string parameters correctly', () => {
            const query = createParameterizedQuery("SELECT * FROM users WHERE name = ?", ["O'Brien"]);
            expect(query.params[0]).toBe("O'Brien"); // Params should be raw, escaping happens at execution
        });
        it('handles null and undefined parameters', () => {
            const query = createParameterizedQuery("SELECT * FROM users WHERE deleted_at = ?", [null]);
            expect(query.params[0]).toBeNull();
        });
    });
    describe('escapeString', () => {
        it('escapes single quotes', () => {
            const result = escapeString("O'Brien");
            expect(result).toBe("O''Brien");
        });
        it('escapes backslashes', () => {
            const result = escapeString("path\\to\\file");
            expect(result).toBe("path\\\\to\\\\file");
        });
        it('escapes newlines', () => {
            const result = escapeString("line1\nline2");
            expect(result).not.toBe("line1\nline2");
        });
        it('escapes null bytes', () => {
            const result = escapeString("hello\0world");
            expect(result).not.toContain("\0");
        });
        it('handles empty string', () => {
            const result = escapeString("");
            expect(result).toBe("");
        });
    });
    describe('isValidIdentifier', () => {
        it('allows valid table names', () => {
            expect(isValidIdentifier("users")).toBe(true);
            expect(isValidIdentifier("user_accounts")).toBe(true);
            expect(isValidIdentifier("Users123")).toBe(true);
        });
        it('rejects identifiers with spaces', () => {
            expect(isValidIdentifier("user accounts")).toBe(false);
        });
        it('rejects identifiers starting with numbers', () => {
            expect(isValidIdentifier("123users")).toBe(false);
        });
        it('rejects SQL keywords as identifiers', () => {
            expect(isValidIdentifier("SELECT")).toBe(false);
            expect(isValidIdentifier("DROP")).toBe(false);
            expect(isValidIdentifier("delete")).toBe(false);
        });
        it('rejects empty identifiers', () => {
            expect(isValidIdentifier("")).toBe(false);
        });
        it('rejects identifiers with special characters', () => {
            expect(isValidIdentifier("users;")).toBe(false);
            expect(isValidIdentifier("users--")).toBe(false);
            expect(isValidIdentifier("users'")).toBe(false);
        });
    });
});
