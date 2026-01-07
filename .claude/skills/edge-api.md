---
name: edge-api
description: Use when building HATEOAS APIs with explorable links, actions, and data. Next-gen of drivly/edge-api.
---

# edge-api Development Skill

## When to Use

- Building explorable REST APIs
- Creating HATEOAS-style responses
- Wrapping RPC methods with HTTP layer

## Response Shape

All edge-api responses follow this structure:

```typescript
{
  api: {
    name: string,
    version: string,
    description?: string,
  },
  links: {
    [key: string]: string,  // Clickable URLs
  },
  actions: {
    [key: string]: {
      method: string,
      href: string,
      fields?: Array<{ name: string, type: string }>,
    },
  },
  data: any,  // The actual response data
  user: {
    authenticated: boolean,
    id?: string,
    email?: string,
    roles?: string[],
  },
}
```

## Basic Usage

```typescript
import { EdgeAPI } from '@dotdo/edge-api'

export default EdgeAPI({
  users: {
    list: () => db.query('SELECT * FROM users'),
    get: (id: string) => db.query('SELECT * FROM users WHERE id = ?', [id]),
    create: (data: UserInput) => db.insert('users', data),
  },
  posts: {
    list: () => db.query('SELECT * FROM posts'),
    // ...
  },
})
```

## Auto-Generated Links

EdgeAPI automatically generates links from your API structure:

```json
{
  "links": {
    "self": "/",
    "users": "/users",
    "users.list": "/users/list",
    "users.get": "/users/:id",
    "posts": "/posts",
    "posts.list": "/posts/list"
  }
}
```

## Integration with RPC

edge-api is the HTTP layer on top of RPC:

```
Request → edge-api (HATEOAS shell) → RPC (method dispatch) → handler
```

## Content Negotiation

Responses adapt to Accept header:
- `application/json` → JSON response
- `text/html` → Rendered HTML via mdxui
- `text/plain` → Plain text

## Checklist for edge-api Endpoints

1. [ ] Define API object with nested methods
2. [ ] Ensure methods return data (not Response objects)
3. [ ] Add input validation with zod if needed
4. [ ] Test links are correctly generated
5. [ ] Verify content negotiation works
