import { describe, it, expect } from 'vitest';
import { createMockRequest, createMockResponse, } from '../src/mocks/index.js';
/**
 * Tests defining the contract for mock Request/Response helpers.
 *
 * These tests define what the mock factories should provide:
 * - Easy creation of Request objects with common configurations
 * - Response creation with status, headers, and body
 * - JSON, text, and binary body helpers
 * - Header manipulation utilities
 */
describe('Mock Request Helpers', () => {
    describe('createMockRequest', () => {
        it('should create a basic GET request with URL', () => {
            const request = createMockRequest({ url: 'https://example.com/api' });
            expect(request).toBeInstanceOf(Request);
            expect(request.url).toBe('https://example.com/api');
            expect(request.method).toBe('GET');
        });
        it('should create a request with custom method', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                method: 'POST',
            });
            expect(request.method).toBe('POST');
        });
        it('should create a request with headers', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer token123',
                },
            });
            expect(request.headers.get('Content-Type')).toBe('application/json');
            expect(request.headers.get('Authorization')).toBe('Bearer token123');
        });
        it('should create a request with JSON body', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                method: 'POST',
                json: { name: 'test', value: 42 },
            });
            expect(request.headers.get('Content-Type')).toBe('application/json');
        });
        it('should create a request with text body', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                method: 'POST',
                body: 'plain text content',
            });
            expect(request.body).toBeDefined();
        });
        it('should create a request with URL search params', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                params: { foo: 'bar', count: '10' },
            });
            const url = new URL(request.url);
            expect(url.searchParams.get('foo')).toBe('bar');
            expect(url.searchParams.get('count')).toBe('10');
        });
        it('should support cf property for Cloudflare-specific request data', () => {
            const request = createMockRequest({
                url: 'https://example.com/api',
                cf: {
                    colo: 'SJC',
                    country: 'US',
                },
            });
            expect(request.cf).toBeDefined();
            expect(request.cf.colo).toBe('SJC');
        });
        it('should default to a reasonable URL when none provided', () => {
            const request = createMockRequest({});
            expect(request.url).toMatch(/^https?:\/\//);
        });
    });
    describe('createMockResponse', () => {
        it('should create a basic 200 response', () => {
            const response = createMockResponse({ status: 200 });
            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(200);
        });
        it('should create a response with custom status', () => {
            const response = createMockResponse({ status: 404 });
            expect(response.status).toBe(404);
        });
        it('should create a response with headers', () => {
            const response = createMockResponse({
                status: 200,
                headers: {
                    'X-Custom-Header': 'custom-value',
                },
            });
            expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
        });
        it('should create a response with JSON body', () => {
            const response = createMockResponse({
                status: 200,
                json: { success: true, data: [1, 2, 3] },
            });
            expect(response.headers.get('Content-Type')).toBe('application/json');
        });
        it('should create a response with text body', () => {
            const response = createMockResponse({
                status: 200,
                body: 'Hello, World!',
            });
            expect(response.body).toBeDefined();
        });
        it('should default to 200 OK when no status provided', () => {
            const response = createMockResponse({});
            expect(response.status).toBe(200);
            expect(response.ok).toBe(true);
        });
        it('should support statusText', () => {
            const response = createMockResponse({
                status: 201,
                statusText: 'Created',
            });
            expect(response.statusText).toBe('Created');
        });
    });
});
