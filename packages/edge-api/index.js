/**
 * @dotdo/edge-api - HATEOAS API Framework
 *
 * Build explorable APIs with auto-generated links, actions, and data.
 * Next-gen of drivly/edge-api.
 *
 * Response shape:
 * ```typescript
 * {
 *   api: { name, version },
 *   links: { ... },
 *   actions: { ... },
 *   data: any,
 *   user: { ... }
 * }
 * ```
 */
import { Hono } from 'hono';
/**
 * Create a HATEOAS API from an object definition
 */
export function EdgeAPI(definition, config) {
    const app = new Hono();
    const apiName = config?.name ?? 'api';
    const apiVersion = config?.version ?? '1.0.0';
    // Generate links from definition
    const links = generateLinks(definition);
    // Root endpoint
    app.get('/', (c) => {
        return respond(c, {
            api: { name: apiName, version: apiVersion },
            links,
            actions: {},
            data: { message: `Welcome to ${apiName}` },
            user: getUserContext(c),
        });
    });
    // Register routes from definition
    for (const [namespace, methods] of Object.entries(definition)) {
        if (typeof methods === 'function') {
            // Top-level method
            registerMethod(app, `/${namespace}`, methods, namespace, links);
        }
        else {
            // Namespace with methods
            app.get(`/${namespace}`, (c) => {
                const namespaceLinks = Object.keys(methods).reduce((acc, method) => {
                    acc[`${namespace}.${method}`] = `/${namespace}/${method}`;
                    return acc;
                }, {});
                return respond(c, {
                    api: { name: apiName, version: apiVersion },
                    links: { ...links, ...namespaceLinks },
                    actions: {},
                    data: { namespace, methods: Object.keys(methods) },
                    user: getUserContext(c),
                });
            });
            for (const [method, handler] of Object.entries(methods)) {
                if (typeof handler === 'function') {
                    registerMethod(app, `/${namespace}/${method}`, handler, `${namespace}.${method}`, links);
                }
            }
        }
    }
    return app;
}
function registerMethod(app, path, handler, name, links) {
    app.all(path, async (c) => {
        let args = [];
        if (c.req.method === 'GET') {
            const params = Object.fromEntries(new URL(c.req.url).searchParams);
            args = Object.values(params);
        }
        else {
            const body = await c.req.json().catch(() => ({}));
            args = Array.isArray(body) ? body : body.args ?? [body];
        }
        try {
            const result = await handler(...args);
            return respond(c, {
                api: { name: 'api', version: '1.0.0' },
                links,
                actions: {},
                data: result,
                user: getUserContext(c),
            });
        }
        catch (error) {
            return respond(c, {
                api: { name: 'api', version: '1.0.0' },
                links,
                actions: {},
                data: { error: String(error) },
                user: getUserContext(c),
            }, 500);
        }
    });
}
function generateLinks(definition) {
    const links = { self: '/' };
    for (const [namespace, methods] of Object.entries(definition)) {
        links[namespace] = `/${namespace}`;
        if (typeof methods !== 'function') {
            for (const method of Object.keys(methods)) {
                links[`${namespace}.${method}`] = `/${namespace}/${method}`;
            }
        }
    }
    return links;
}
function getUserContext(c) {
    const userId = c.req.header('x-user-id');
    const email = c.req.header('x-user-email');
    const roles = c.req.header('x-user-roles')?.split(',').filter(Boolean);
    return {
        authenticated: !!userId,
        id: userId,
        email: email || undefined,
        roles: roles?.length ? roles : undefined,
    };
}
function respond(c, response, status = 200) {
    const accept = c.req.header('accept') || '';
    if (accept.includes('text/html')) {
        // Render HTML (simplified, would use mdxui in full impl)
        return c.html(renderHTML(response), status);
    }
    return c.json(response, status);
}
function renderHTML(response) {
    const linksHtml = Object.entries(response.links)
        .map(([name, href]) => `<li><a href="${href}">${name}</a></li>`)
        .join('\n');
    return `<!DOCTYPE html>
<html>
<head>
  <title>${response.api.name}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${response.api.name} v${response.api.version}</h1>
  <h2>Links</h2>
  <ul>${linksHtml}</ul>
  <h2>Data</h2>
  <pre>${JSON.stringify(response.data, null, 2)}</pre>
</body>
</html>`;
}
export default EdgeAPI;
