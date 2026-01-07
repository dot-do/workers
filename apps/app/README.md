# @dotdo/app-app

User-facing application UI for workers.do sites.

## Overview

The app package provides the primary user-facing interface for workers.do sites. It serves as the main application shell where users interact with site-specific features, manage their accounts, and access core functionality.

## Route

```
/app
```

Accessible at `my-site.workers.do/app` on any workers.do site.

## Features

- User authentication flows (login, signup, logout)
- Account management
- User profile settings
- Site-specific feature interfaces
- API key management (user-level)
- Organization membership views
- Notification preferences
- Session management

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

The app UI is automatically available at the `/app` route on any workers.do site:

```
my-site.workers.do/app      -> application UI
my-site.workers.do/app/*    -> application routes
```

## Authentication

The app integrates with Better Auth for:
- Email/password authentication
- OAuth providers (via WorkOS)
- API key authentication
- Session management with JWT cookies
- Organization-based multi-tenancy

## Structure

```
apps/app/
├── src/
│   ├── routes/        # React Router routes
│   ├── components/    # UI components
│   └── main.tsx       # Entry point
├── vite.config.ts
└── package.json
```
