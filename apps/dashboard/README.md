# @dotdo/app-dashboard

Analytics and monitoring dashboard for workers.do sites.

## Overview

The dashboard app provides analytics visualization, performance monitoring, and operational insights for workers.do deployments. It displays data collected through the analytics pipeline (Snippets -> Pipelines -> R2 Data Catalog).

## Route

```
/dashboard
```

Accessible at `my-site.workers.do/dashboard` on any workers.do site.

## Features

- Real-time request analytics
- Traffic visualization (by path, method, status)
- Cache hit/miss ratios
- Geographic distribution (colo, country)
- User engagement metrics
- Error tracking and alerting
- Performance monitoring
- R2 SQL query interface
- Custom date range filtering

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

The dashboard UI is automatically available at the `/dashboard` route on any workers.do site:

```
my-site.workers.do/dashboard      -> dashboard UI
my-site.workers.do/dashboard/*    -> dashboard routes
```

## Analytics Data Flow

```
cache snippet -> HTTP endpoint -> Pipelines -> R2 Data Catalog (Iceberg)
                                                      |
                                                      v
                                               R2 SQL queries
                                                      |
                                                      v
                                               Dashboard UI
```

Analytics events captured include:
- Timestamp
- Hostname and path
- HTTP method and status
- Cache status (HIT/MISS)
- Cloudflare metadata (colo, country)
- User ID (authenticated) or anonymous ID (sqid)

## Structure

```
apps/dashboard/
├── src/
│   ├── routes/        # React Router routes
│   ├── components/    # UI components (charts, tables)
│   └── main.tsx       # Entry point
├── vite.config.ts
└── package.json
```
