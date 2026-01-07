/**
 * XSS Prevention Utilities for Cloudflare Workers
 *
 * This module provides security functions to prevent Cross-Site Scripting (XSS) attacks
 * in serverless environments. All functions are designed to be lightweight and
 * compatible with the Cloudflare Workers runtime.
 */
/**
 * Encodes HTML special characters to prevent XSS injection
 */
export function encodeHtmlEntities(input) {
    if (!input)
        return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
/**
 * Decodes HTML entities back to their original characters
 */
export function decodeHtmlEntities(input) {
    if (!input)
        return '';
    return input
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}
/**
 * Detects if a string contains script tags
 */
export function detectScriptTags(input) {
    // Match <script> tags with optional whitespace and attributes, case-insensitive
    const scriptPattern = /<\s*script[\s>]/i;
    return scriptPattern.test(input);
}
/**
 * Escapes/removes script tags from input
 */
export function escapeScriptTags(input) {
    // Remove opening and closing script tags (with any attributes)
    return input
        .replace(/<\s*script[^>]*>/gi, '')
        .replace(/<\s*\/\s*script\s*>/gi, '');
}
/**
 * Sanitizes HTML by removing event handler attributes
 */
export function sanitizeEventHandlers(input) {
    // Remove all on* event handler attributes (onclick, onload, onmouseover, etc.)
    // Matches on[a-z]+ followed by = and a quoted or unquoted value
    return input.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}
/**
 * Validates if a URL is safe (not javascript:, data:, etc.)
 */
export function isValidUrl(url) {
    // Reject javascript: and data: URLs
    if (isJavaScriptUrl(url))
        return false;
    // Check for data: URLs
    const normalizedUrl = url.replace(/[\t\n\r]/g, '').trim().toLowerCase();
    if (normalizedUrl.startsWith('data:'))
        return false;
    // Allow http, https, relative URLs
    return true;
}
/**
 * Checks if a URL uses the javascript: scheme
 */
export function isJavaScriptUrl(url) {
    // Normalize by removing tabs, newlines, carriage returns and trimming
    const normalizedUrl = url.replace(/[\t\n\r]/g, '').trim().toLowerCase();
    return normalizedUrl.startsWith('javascript:');
}
/**
 * Sanitizes a URL, returning about:blank for dangerous URLs
 */
export function sanitizeUrl(url) {
    if (isValidUrl(url)) {
        return url;
    }
    return 'about:blank';
}
/**
 * Generates a Content-Security-Policy header value from directives
 */
export function generateCspHeader(directives) {
    const parts = [];
    // Map of camelCase property names to kebab-case CSP directive names
    const directiveMap = {
        defaultSrc: 'default-src',
        scriptSrc: 'script-src',
        styleSrc: 'style-src',
        imgSrc: 'img-src',
        connectSrc: 'connect-src',
        fontSrc: 'font-src',
        objectSrc: 'object-src',
        mediaSrc: 'media-src',
        frameSrc: 'frame-src',
        childSrc: 'child-src',
        workerSrc: 'worker-src',
        frameAncestors: 'frame-ancestors',
        formAction: 'form-action',
        baseUri: 'base-uri',
        reportUri: 'report-uri',
        reportTo: 'report-to',
    };
    for (const [key, value] of Object.entries(directives)) {
        if (key === 'upgradeInsecureRequests' && value === true) {
            parts.push('upgrade-insecure-requests');
        }
        else if (key === 'blockAllMixedContent' && value === true) {
            parts.push('block-all-mixed-content');
        }
        else if (Array.isArray(value) && directiveMap[key]) {
            parts.push(`${directiveMap[key]} ${value.join(' ')}`);
        }
    }
    return parts.join('; ');
}
/**
 * Creates a cryptographically random nonce for CSP
 */
export function createCspNonce() {
    // Generate 16 random bytes and convert to base64
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
}
