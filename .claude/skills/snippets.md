---
name: snippets
description: Use when working with Cloudflare Snippets - free tier workers with strict constraints (<5ms CPU, <32KB, no bindings).
---

# Snippets Development Skill

## When to Use

- Creating free-tier routing/caching/auth logic
- Optimizing for zero-cost edge execution
- Building snippet cascade (auth → cache → origin)

## Snippet Constraints

**CRITICAL** - All snippets must:
- Use < 5ms CPU time
- Be < 32KB compressed
- Have NO bindings (no KV, D1, DO, etc.)
- Limited subrequests (2 on Pro, 5 on Enterprise)

## Snippet Cascade

```
Request → auth snippet → cache snippet → origin
              │               │
         verify JWT      analytics + caching
```

Each snippet passes control to the next via `fetch(request)`.

## Available Snippets

### cache.ts
- Edge caching with Cloudflare Cache API
- Analytics event capture (fires on every request, even cache hits)
- Settings/session cookie management (sqid-based)

### auth.ts
- JWT verification via subrequest to jose worker
- Adds auth context to request headers
- Cookie parsing for auth token

### router.ts
- Dynamic routing to Static Assets
- Hostname → site bundle mapping
- llms.txt endpoint for LLM consumption

## Analytics Event Shape

```typescript
{
  timestamp: number,
  hostname: string,
  path: string,
  method: string,
  status: number,
  cache: 'HIT' | 'MISS',
  colo: string,
  country: string,
  userId?: string,      // If authenticated
  anonymousId: string,  // sqid from ASN/colo/country/IP
}
```

## Cookie Strategy

| Cookie | Format | Purpose |
|--------|--------|---------|
| auth | JWT | User authentication |
| settings | sqid | Anonymous ID + preferences |
| session | sqid | Session tracking |

## Checklist for New Snippets

1. [ ] Verify < 5ms CPU (use `performance.now()`)
2. [ ] Check compressed size < 32KB
3. [ ] No bindings or imports that require bindings
4. [ ] Subrequests within limit
5. [ ] Test in snippet cascade order
6. [ ] Add to `snippets/index.ts` exports
