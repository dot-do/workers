# Workers for Platforms - Dispatch Namespaces

This document describes the Cloudflare Workers for Platforms dispatch namespaces configured for the `.do` project.

## Overview

Workers for Platforms uses **dispatch namespaces** to organize and isolate user Workers across different environments. Each namespace is a collection of Workers that can be dynamically routed via a dispatch Worker.

## Configured Namespaces

### Production Environment

- **Namespace Name:** `dotdo-production`
- **Namespace ID:** `62ce3520-96e8-4d9d-a37d-83e99d5319ab`
- **Mode:** Trusted (we control all worker code)
- **Script Count:** 0
- **Created:** 2025-10-04T01:56:12.190849Z
- **Purpose:** Production workloads serving live traffic

### Staging Environment

- **Namespace Name:** `dotdo-staging`
- **Namespace ID:** `6eb2b6e7-5e8c-4ce6-bb63-7185e2dadc0e`
- **Mode:** Trusted (we control all worker code)
- **Script Count:** 0
- **Created:** 2025-10-04T01:59:27.651669Z
- **Purpose:** Pre-production testing and QA validation

### Development Environment

- **Namespace Name:** `dotdo-development`
- **Namespace ID:** `c1a5acfb-fc81-43fc-8d99-8856c6a45c4a`
- **Mode:** Trusted (we control all worker code)
- **Script Count:** 0
- **Created:** 2025-10-04T01:59:43.158969Z
- **Purpose:** Development, testing, and experimentation

## Environment Variable Mapping

For deployment scripts and CI/CD pipelines, use these environment variable mappings:

```bash
# Production
DISPATCH_NAMESPACE_PRODUCTION="dotdo-production"
DISPATCH_NAMESPACE_ID_PRODUCTION="62ce3520-96e8-4d9d-a37d-83e99d5319ab"

# Staging
DISPATCH_NAMESPACE_STAGING="dotdo-staging"
DISPATCH_NAMESPACE_ID_STAGING="6eb2b6e7-5e8c-4ce6-bb63-7185e2dadc0e"

# Development
DISPATCH_NAMESPACE_DEVELOPMENT="dotdo-development"
DISPATCH_NAMESPACE_ID_DEVELOPMENT="c1a5acfb-fc81-43fc-8d99-8856c6a45c4a"
```

## Cloudflare Account

- **Account ID:** `b6641681fe423910342b9ffa1364c76d`
- **Account Name:** Driv.ly

## Namespace Configuration

### Trusted Mode

All namespaces are configured in **trusted mode**, which means:
- We have full control over all Worker code deployed to these namespaces
- Workers can access all Cloudflare runtime APIs without restrictions
- No sandboxing or code isolation between Workers in the same namespace
- Suitable for internal/controlled deployments

### Isolation

Each namespace is completely isolated:
- Workers in `dotdo-production` cannot access Workers in `dotdo-staging` or `dotdo-development`
- Cache is namespaced per dispatch namespace
- Bindings (KV, D1, R2, etc.) are configured per Worker

## Deployment Workflow

### Traditional Deployment (Current - Being Replaced)
```bash
# Uses Cloudflare API token in GitHub secrets
wrangler deploy --env production
```

### Workers for Platforms Deployment (New)
```bash
# Uses our deploy API with namespace routing
wrangler deploy --dispatch-namespace dotdo-production
```

## Dynamic Dispatch Worker

To route requests to Workers in these namespaces, configure a dynamic dispatch Worker with namespace bindings:

```jsonc
// wrangler.jsonc
{
  "dispatch_namespaces": [
    {
      "binding": "DISPATCHER_PRODUCTION",
      "namespace": "dotdo-production"
    },
    {
      "binding": "DISPATCHER_STAGING",
      "namespace": "dotdo-staging"
    },
    {
      "binding": "DISPATCHER_DEVELOPMENT",
      "namespace": "dotdo-development"
    }
  ]
}
```

Then in your dispatch Worker:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // Determine which namespace to use based on hostname/routing logic
    const namespace = getNamespaceForRequest(request);

    // Get the target Worker name from the request
    const workerName = getWorkerNameFromRequest(request);

    // Dispatch to the appropriate Worker in the namespace
    const worker = env[namespace].get(workerName);
    return worker.fetch(request);
  }
}
```

## API Endpoints

### Create Worker in Namespace
```bash
curl "https://api.cloudflare.com/client/v4/accounts/b6641681fe423910342b9ffa1364c76d/workers/dispatch/namespaces/{namespace_name}/scripts/{worker_name}" \
  -X PUT \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "metadata=..." \
  -F "worker.js=@worker.js"
```

### List Workers in Namespace
```bash
curl "https://api.cloudflare.com/client/v4/accounts/b6641681fe423910342b9ffa1364c76d/workers/dispatch/namespaces/{namespace_name}/scripts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### Delete Worker from Namespace
```bash
curl "https://api.cloudflare.com/client/v4/accounts/b6641681fe423910342b9ffa1364c76d/workers/dispatch/namespaces/{namespace_name}/scripts/{worker_name}" \
  -X DELETE \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

## Wrangler Commands

### List Namespaces
```bash
wrangler dispatch-namespace list
```

### Deploy to Namespace
```bash
wrangler deploy --dispatch-namespace dotdo-production
```

### Local Development with Remote Namespace
```bash
# wrangler.jsonc
{
  "dispatch_namespaces": [
    {
      "binding": "DISPATCHER",
      "namespace": "dotdo-development",
      "experimental_remote": true
    }
  ]
}

# Run locally but connect to remote namespace
wrangler dev
```

## Migration Notes

### Why Workers for Platforms?

**Security Benefits:**
- ✅ No Cloudflare API tokens stored in GitHub secrets
- ✅ Our deploy API handles authentication and authorization
- ✅ Fine-grained access control per namespace/worker
- ✅ Audit trail of all deployments via our API

**Scalability:**
- ✅ Dynamic routing without route configuration
- ✅ Programmatic worker management
- ✅ Isolated environments per namespace

**Developer Experience:**
- ✅ Same wrangler CLI workflow
- ✅ Local development with remote namespaces
- ✅ Clear separation of production/staging/dev

### Migration Path

1. ✅ **Phase 1 (Complete):** Create dispatch namespaces
2. **Phase 2:** Build deploy API with namespace routing
3. **Phase 3:** Create dynamic dispatch Workers for routing
4. **Phase 4:** Migrate existing Workers to namespaces
5. **Phase 5:** Update CI/CD to use deploy API
6. **Phase 6:** Remove Cloudflare API tokens from GitHub

## Monitoring

### Namespace Health Checks
```bash
# Check namespace exists and get worker count
wrangler dispatch-namespace list | grep dotdo-production

# List all workers in a namespace
wrangler dispatch-namespace list-workers dotdo-production
```

### Deployment Verification
After deploying a Worker to a namespace:
1. Verify Worker appears in namespace: `wrangler dispatch-namespace list-workers {namespace}`
2. Test Worker via dispatch Worker routing
3. Monitor Worker logs: `wrangler tail {worker-name} --dispatch-namespace {namespace}`

## Troubleshooting

### Namespace Not Found
- Verify namespace name is lowercase with no special characters except dashes
- Check namespace exists: `wrangler dispatch-namespace list`
- Verify account ID is correct

### Worker Not Accessible
- Ensure Worker is deployed to the correct namespace
- Verify dispatch Worker has correct namespace binding
- Check dispatch Worker routing logic

### Permission Denied
- Verify API token has Workers for Platforms permissions
- Check account ID matches namespace account
- Ensure user/token has access to the account

## References

- [Cloudflare Workers for Platforms Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)
- [Dispatch Namespaces Guide](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/how-workers-for-platforms-works/#dispatch-namespace)
- [Dynamic Dispatch Workers](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/dynamic-dispatch/)
- [Wrangler Dispatch Namespace Commands](https://developers.cloudflare.com/workers/wrangler/commands/#dispatch-namespace)

---

**Created:** 2025-10-04
**Last Updated:** 2025-10-04
**Managed By:** Infrastructure Setup Subagent (Workers for Platforms Migration)
