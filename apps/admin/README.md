# @dotdo/app-admin

Platform admin UI for workers.do sites.

## Overview

The admin app provides platform administrators with tools for user management, secrets configuration, billing, and system settings. It requires admin role authentication to access.

## Route

```
/admin
```

Accessible at `my-site.workers.do/admin` on any workers.do site.

## Features

- User management (list, create, edit, delete users)
- Role and permission configuration
- Secrets and environment variable management
- Billing and subscription controls
- Organization settings
- API key administration
- System health monitoring

## Tech Stack

- Vite - Build tool and dev server
- React 19 - UI framework
- React Router 7 - Routing
- Tailwind CSS 4 - Styling
- shadcn/ui - Component library
- @dotdo/auth - Authentication integration

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Embedding

The admin UI is automatically available at the `/admin` route on any workers.do site. The umbrella worker routes requests based on path prefix:

```
my-site.workers.do/admin      -> admin UI (requires admin role)
my-site.workers.do/admin/*    -> admin UI routes
```

Authentication is handled via Better Auth with the admin plugin. Users must have the appropriate admin role to access this interface.

## Structure

```
apps/admin/
├── src/
│   ├── routes/        # React Router routes
│   ├── components/    # UI components
│   └── main.tsx       # Entry point
├── vite.config.ts
└── package.json
```
