/**
 * Router Snippet - Dynamic Routing to Static Assets
 *
 * Routes requests to static assets based on hostname.
 * Enables 100k+ sites from a single Workers Static Assets deployment.
 *
 * Hostname mapping: my-site.workers.do → sites/my-site.jsonl
 *
 * Site bundle format:
 * { module: "compiled JS", mdx: "raw MDX", html: "rendered HTML" }
 */
export async function routerSnippet(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    // Extract site name from hostname (my-site.workers.do → my-site)
    const siteName = hostname.split('.')[0];
    // Special routes
    if (url.pathname === '/llms.txt') {
        return serveLlmsTxt(siteName);
    }
    // Load site bundle from static assets
    const bundleUrl = `https://static.workers.do/sites/${siteName}.jsonl`;
    try {
        const bundleResponse = await fetch(bundleUrl);
        if (!bundleResponse.ok) {
            return new Response('Site not found', { status: 404 });
        }
        const bundle = await bundleResponse.json();
        // Serve based on Accept header
        const accept = request.headers.get('accept') || '';
        if (accept.includes('text/html')) {
            return new Response(bundle.html, {
                headers: { 'Content-Type': 'text/html' },
            });
        }
        if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
            return new Response(bundle.mdx, {
                headers: { 'Content-Type': 'text/markdown' },
            });
        }
        // Default: return module for dynamic execution
        return new Response(bundle.module, {
            headers: { 'Content-Type': 'application/javascript' },
        });
    }
    catch {
        return new Response('Error loading site', { status: 500 });
    }
}
async function serveLlmsTxt(siteName) {
    // Return all markdown content for LLM consumption
    const bundleUrl = `https://static.workers.do/sites/${siteName}.jsonl`;
    try {
        const bundleResponse = await fetch(bundleUrl);
        if (!bundleResponse.ok) {
            return new Response('Site not found', { status: 404 });
        }
        const bundle = await bundleResponse.json();
        return new Response(bundle.mdx, {
            headers: { 'Content-Type': 'text/plain' },
        });
    }
    catch {
        return new Response('Error loading llms.txt', { status: 500 });
    }
}
export default { fetch: routerSnippet };
